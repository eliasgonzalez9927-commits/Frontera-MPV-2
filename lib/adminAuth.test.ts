import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";

// lib/adminAuth.ts imports "server-only", which throws outside Next's RSC
// bundler condition. Stub it so this file can run under plain Node/vitest.
vi.mock("server-only", () => ({}));

import {
  createAdminSessionToken,
  isAdminLoginConfigured,
  validateAdminAuthorization,
  validateAdminCredentials,
} from "./adminAuth";

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signWith(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function fakeRequest(bearer?: string) {
  const headers = new Headers();
  if (bearer !== undefined) {
    headers.set("authorization", `Bearer ${bearer}`);
  }
  return new Request("https://example.com", { headers });
}

beforeEach(() => {
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "frontera-demo-2026";
  process.env.ADMIN_SESSION_SECRET = "test-session-secret";
});

describe("isAdminLoginConfigured", () => {
  it("is true when ADMIN_PASSWORD is set", () => {
    expect(isAdminLoginConfigured()).toBe(true);
  });

  it("is false when ADMIN_PASSWORD is unset", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(isAdminLoginConfigured()).toBe(false);
  });
});

describe("validateAdminCredentials", () => {
  it("accepts the configured username and password", () => {
    expect(validateAdminCredentials("admin", "frontera-demo-2026")).toBe(true);
  });

  it("rejects the wrong password", () => {
    expect(validateAdminCredentials("admin", "wrong-password")).toBe(false);
  });

  it("rejects the wrong username", () => {
    expect(validateAdminCredentials("someone-else", "frontera-demo-2026")).toBe(false);
  });

  it("defaults the username to 'admin' when ADMIN_USERNAME is unset", () => {
    delete process.env.ADMIN_USERNAME;
    expect(validateAdminCredentials("admin", "frontera-demo-2026")).toBe(true);
  });

  it("always rejects when ADMIN_PASSWORD is not configured at all", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(validateAdminCredentials("admin", "")).toBe(false);
    expect(validateAdminCredentials("admin", "anything")).toBe(false);
  });
});

describe("createAdminSessionToken", () => {
  it("returns a token whose payload has the expected claims", () => {
    const session = createAdminSessionToken("admin");
    expect(session).not.toBeNull();

    const [payloadPart] = session!.token.split(".");
    const decoded = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8")
    );

    expect(decoded).toMatchObject({ sub: "admin", typ: "admin" });
    expect(decoded.exp).toBe(session!.expiresAt);
  });

  it("falls back to signing with ADMIN_PASSWORD when ADMIN_SESSION_SECRET is unset", () => {
    delete process.env.ADMIN_SESSION_SECRET;
    const session = createAdminSessionToken("admin");
    expect(session).not.toBeNull();
  });

  it("returns null when no secret can be resolved at all", () => {
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.ADMIN_PASSWORD;
    const session = createAdminSessionToken("admin");
    expect(session).toBeNull();
  });
});

describe("validateAdminAuthorization — happy path", () => {
  it("accepts a token created by createAdminSessionToken", () => {
    const session = createAdminSessionToken("admin")!;
    const result = validateAdminAuthorization(fakeRequest(session.token));
    expect(result).toEqual({ ok: true, status: 200, message: "OK" });
  });
});

describe("validateAdminAuthorization — malformed / missing input", () => {
  it("rejects a request with no Authorization header", () => {
    const result = validateAdminAuthorization(fakeRequest());
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects an Authorization header without the Bearer prefix", () => {
    const request = new Request("https://example.com", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    const result = validateAdminAuthorization(request);
    expect(result.ok).toBe(false);
  });

  it("rejects a token with no payload.signature split", () => {
    const result = validateAdminAuthorization(fakeRequest("not-a-real-token"));
    expect(result.ok).toBe(false);
  });

  it("rejects a payload that isn't valid JSON once decoded", () => {
    const badPayload = base64UrlEncode("not json");
    const signature = signWith("test-session-secret", badPayload);
    const result = validateAdminAuthorization(
      fakeRequest(`${badPayload}.${signature}`)
    );
    expect(result.ok).toBe(false);
  });
});

describe("validateAdminAuthorization — signature and expiry", () => {
  it("rejects a token with a tampered signature", () => {
    const session = createAdminSessionToken("admin")!;
    const [payloadPart] = session.token.split(".");
    const tampered = `${payloadPart}.${"0".repeat(64)}`;
    const result = validateAdminAuthorization(fakeRequest(tampered));
    expect(result.ok).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const payload = base64UrlEncode(
      JSON.stringify({
        sub: "admin",
        typ: "admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    const wrongSignature = signWith("some-other-secret", payload);
    const result = validateAdminAuthorization(
      fakeRequest(`${payload}.${wrongSignature}`)
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    const session = createAdminSessionToken("admin")!;
    vi.advanceTimersByTime(13 * 60 * 60 * 1000); // 13h, TTL is 12h
    const result = validateAdminAuthorization(fakeRequest(session.token));
    expect(result.ok).toBe(false);
    vi.useRealTimers();
  });
});

describe("validateAdminAuthorization — typ claim (security regression)", () => {
  // Production incident, 2026-08-11: clinic session tokens and admin
  // session tokens shared a signing secret (ADMIN_SESSION_SECRET), and this
  // validator only checked sub/exp — so any correctly-signed clinic session
  // token (any role, including plain "staff") also validated as a
  // super-admin bearer. A staff account could create admin accounts on its
  // own clinic, and could in principle hit any /api/admin/* endpoint.
  // Fixed by requiring typ === "admin" explicitly. These tests must keep
  // failing if that check is ever removed or weakened.

  function tokenWithPayload(payload: object, secret = "test-session-secret") {
    const encoded = base64UrlEncode(JSON.stringify(payload));
    const signature = signWith(secret, encoded);
    return `${encoded}.${signature}`;
  }

  it("rejects a correctly-signed token missing the typ claim entirely", () => {
    const token = tokenWithPayload({
      sub: "clinica-demo",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const result = validateAdminAuthorization(fakeRequest(token));
    expect(result.ok).toBe(false);
  });

  it("rejects a correctly-signed clinic-shaped token (typ: 'clinic') even with extra fields", () => {
    const token = tokenWithPayload({
      sub: "clinica-demo-staff",
      clinic: "clinica-demo",
      role: "staff",
      typ: "clinic",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const result = validateAdminAuthorization(fakeRequest(token));
    expect(result.ok).toBe(false);
  });

  it("rejects typ values that merely look admin-ish", () => {
    for (const typ of ["Admin", "ADMIN", "administrator", "", null, 1, true]) {
      const token = tokenWithPayload({
        sub: "admin",
        typ,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const result = validateAdminAuthorization(fakeRequest(token));
      expect(result.ok).toBe(false);
    }
  });

  it("only accepts typ === 'admin' exactly", () => {
    const token = tokenWithPayload({
      sub: "admin",
      typ: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const result = validateAdminAuthorization(fakeRequest(token));
    expect(result.ok).toBe(true);
  });
});
