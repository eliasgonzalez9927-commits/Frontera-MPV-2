import { beforeEach, describe, expect, it, vi } from "vitest";

// lib/clinics.ts (and lib/supabase/server.ts) import "server-only", which
// throws outside Next's RSC bundler condition. Stub it so this file can run
// under plain Node/vitest.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({
  validateAdminAuthorization: vi.fn(),
}));

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validateAdminAuthorization } from "@/lib/adminAuth";
import {
  createClinicSessionToken,
  generateClinicPassword,
  getActiveClinicBySlug,
  getPrimaryClinicAdmin,
  hashClinicPassword,
  upsertClinicUser,
  validateClinicAccessBySlug,
  validateClinicCredentials,
} from "./clinics";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";

const mockedGetSupabase = vi.mocked(getSupabaseServerClient);
const mockedValidateAdmin = vi.mocked(validateAdminAuthorization);

/**
 * Minimal fake of the supabase-js chainable query builder. Every chain
 * method returns itself; the chain resolves to `response` whenever it's
 * awaited (from a Promise perspective — real supabase-js query builders are
 * "thenable" at every step), so tests can await `.eq(...).maybeSingle()`,
 * `.insert(...)`, or the bare `.select(...)` chain the same way the real
 * client would be used.
 */
function makeQueryBuilder(response: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    update: () => builder,
    insert: () => builder,
    maybeSingle: () => Promise.resolve(response),
    single: () => Promise.resolve(response),
    then: (
      resolve: (value: typeof response) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(response).then(resolve, reject),
  };

  return builder;
}

/** `table -> response` map, or a function for tests needing per-call logic. */
function makeSupabaseMock(
  responses:
    | Record<string, { data: unknown; error: unknown }>
    | ((table: string) => { data: unknown; error: unknown })
) {
  return {
    from: (table: string) => {
      const response =
        typeof responses === "function" ? responses(table) : responses[table];
      return makeQueryBuilder(response);
    },
  } as unknown as ReturnType<typeof getSupabaseServerClient>;
}

function fakeRequest(bearer?: string) {
  const headers = new Headers();
  if (bearer !== undefined) {
    headers.set("authorization", `Bearer ${bearer}`);
  }
  return new Request("https://example.com", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_SESSION_SECRET = "test-secret";
  delete process.env.CLINIC_SESSION_SECRET;
  mockedValidateAdmin.mockReturnValue({
    ok: false,
    status: 401,
    message: "not admin",
  });
});

describe("generateClinicPassword", () => {
  it("generates a non-empty, url-safe string", () => {
    const password = generateClinicPassword();
    expect(password.length).toBeGreaterThan(0);
    expect(password).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates different passwords on each call", () => {
    const a = generateClinicPassword();
    const b = generateClinicPassword();
    expect(a).not.toBe(b);
  });
});

describe("hashClinicPassword", () => {
  it("produces a hash that verifies against the original password via bcrypt", async () => {
    const hash = await hashClinicPassword("correcthorsebatterystaple");
    expect(await bcrypt.compare("correcthorsebatterystaple", hash)).toBe(true);
  });

  it("does not verify against a different password", async () => {
    const hash = await hashClinicPassword("correcthorsebatterystaple");
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });
});

describe("createClinicSessionToken", () => {
  it("returns a decodable token with the expected claims", () => {
    const session = createClinicSessionToken("clinica-demo", "clinica-demo", "admin");
    expect(session).not.toBeNull();

    const [payloadPart] = session!.token.split(".");
    const decoded = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8")
    );

    expect(decoded).toMatchObject({
      sub: "clinica-demo",
      clinic: "clinica-demo",
      role: "admin",
      typ: "clinic",
    });
    expect(decoded.exp).toBe(session!.expiresAt);
  });

  it("returns null when no signing secret is configured", () => {
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.CLINIC_SESSION_SECRET;

    const session = createClinicSessionToken("clinica-demo", "clinica-demo", "staff");
    expect(session).toBeNull();
  });
});

describe("getActiveClinicBySlug", () => {
  it("returns the clinic when found and active", async () => {
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({
        clinics: {
          data: { id: "1", name: "Clinica Demo", slug: "clinica-demo", is_active: true },
          error: null,
        },
      })
    );

    const result = await getActiveClinicBySlug("clinica-demo");
    expect(result).toEqual({
      ok: true,
      clinic: { id: "1", name: "Clinica Demo", slug: "clinica-demo", isActive: true },
    });
  });

  it("fails when the clinic is inactive", async () => {
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({
        clinics: {
          data: { id: "1", name: "Clinica Demo", slug: "clinica-demo", is_active: false },
          error: null,
        },
      })
    );

    const result = await getActiveClinicBySlug("clinica-demo");
    expect(result.ok).toBe(false);
  });

  it("fails when the clinic does not exist", async () => {
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({ clinics: { data: null, error: null } })
    );

    const result = await getActiveClinicBySlug("no-existe");
    expect(result).toEqual({
      ok: false,
      status: 404,
      message: "Clinica no encontrada o inactiva.",
    });
  });

  it("fails fast on an empty slug without touching the database", async () => {
    const result = await getActiveClinicBySlug("   ");
    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "El slug de clinica es obligatorio.",
    });
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });
});

describe("validateClinicCredentials", () => {
  async function mockClinicUser(overrides: Partial<Record<string, unknown>> = {}) {
    const passwordHash = await hashClinicPassword("s3cret-pass");
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({
        clinic_users: {
          data: {
            id: "u1",
            clinic_id: "c1",
            username: "clinica-demo",
            password_hash: passwordHash,
            role: "admin",
            is_active: true,
            clinics: { id: "c1", name: "Clinica Demo", slug: "clinica-demo", is_active: true },
            ...overrides,
          },
          error: null,
        },
      })
    );
  }

  it("succeeds with the correct username and password", async () => {
    await mockClinicUser();

    const result = await validateClinicCredentials("clinica-demo", "s3cret-pass");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.role).toBe("admin");
      expect(result.session.isSuperAdmin).toBe(false);
      expect(result.session.clinic.slug).toBe("clinica-demo");
    }
  });

  it("fails with the wrong password", async () => {
    await mockClinicUser();

    const result = await validateClinicCredentials("clinica-demo", "wrong-password");
    expect(result).toEqual({
      ok: false,
      status: 401,
      message: "Usuario o contrasena incorrectos.",
    });
  });

  it("fails when the account is deactivated", async () => {
    await mockClinicUser({ is_active: false });

    const result = await validateClinicCredentials("clinica-demo", "s3cret-pass");
    expect(result.ok).toBe(false);
  });

  it("fails when the clinic itself is inactive", async () => {
    await mockClinicUser({
      clinics: { id: "c1", name: "Clinica Demo", slug: "clinica-demo", is_active: false },
    });

    const result = await validateClinicCredentials("clinica-demo", "s3cret-pass");
    expect(result.ok).toBe(false);
  });

  it("fails when the username does not exist", async () => {
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({ clinic_users: { data: null, error: null } })
    );

    const result = await validateClinicCredentials("no-existe", "whatever");
    expect(result.ok).toBe(false);
  });

  it("rejects empty username or password without touching the database", async () => {
    const result = await validateClinicCredentials("", "");
    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "Usuario y contrasena son obligatorios.",
    });
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });
});

describe("validateClinicAccessBySlug — super-admin bypass", () => {
  it("grants access when the admin bearer is valid, scoped to the requested clinic", async () => {
    mockedValidateAdmin.mockReturnValue({ ok: true, status: 200, message: "OK" });
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({
        clinics: {
          data: { id: "1", name: "Clinica Demo", slug: "clinica-demo", is_active: true },
          error: null,
        },
      })
    );

    const result = await validateClinicAccessBySlug(
      "clinica-demo",
      fakeRequest("some-admin-token")
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.isSuperAdmin).toBe(true);
      expect(result.session.role).toBe("admin");
      expect(result.session.clinic.slug).toBe("clinica-demo");
    }
  });

  it("still fails if the admin bearer is valid but the clinic doesn't exist", async () => {
    mockedValidateAdmin.mockReturnValue({ ok: true, status: 200, message: "OK" });
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({ clinics: { data: null, error: null } })
    );

    const result = await validateClinicAccessBySlug(
      "no-existe",
      fakeRequest("some-admin-token")
    );

    expect(result.ok).toBe(false);
  });
});

describe("validateClinicAccessBySlug — clinic session tokens", () => {
  it("grants access with a valid, matching-slug clinic session token", async () => {
    const session = createClinicSessionToken("clinica-demo", "personal1", "staff")!;
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({
        clinics: {
          data: { id: "1", name: "Clinica Demo", slug: "clinica-demo", is_active: true },
          error: null,
        },
      })
    );

    const result = await validateClinicAccessBySlug(
      "clinica-demo",
      fakeRequest(session.token)
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.isSuperAdmin).toBe(false);
      expect(result.session.role).toBe("staff");
      expect(result.session.username).toBe("personal1");
    }
  });

  it("rejects a token scoped to a different clinic — no cross-clinic access", async () => {
    const session = createClinicSessionToken("clinica-a", "personal1", "staff")!;

    const result = await validateClinicAccessBySlug(
      "clinica-b",
      fakeRequest(session.token)
    );

    expect(result.ok).toBe(false);
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it("rejects a request with no Authorization header", async () => {
    const result = await validateClinicAccessBySlug("clinica-demo", fakeRequest());
    expect(result).toEqual({
      ok: false,
      status: 401,
      message: "Sesion de clinica invalida o ausente.",
    });
  });

  it("rejects a malformed token (no payload.signature split)", async () => {
    const result = await validateClinicAccessBySlug(
      "clinica-demo",
      fakeRequest("not-a-real-token")
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a token with a tampered signature", async () => {
    const session = createClinicSessionToken("clinica-demo", "personal1", "staff")!;
    const [payloadPart] = session.token.split(".");
    const tampered = `${payloadPart}.0000000000000000000000000000000000000000000000000000000000000000`;

    const result = await validateClinicAccessBySlug("clinica-demo", fakeRequest(tampered));
    expect(result.ok).toBe(false);
  });

  it("rejects an expired token", async () => {
    vi.useFakeTimers();
    const session = createClinicSessionToken("clinica-demo", "personal1", "staff")!;
    vi.advanceTimersByTime(13 * 60 * 60 * 1000); // 13h, TTL is 12h

    const result = await validateClinicAccessBySlug(
      "clinica-demo",
      fakeRequest(session.token)
    );
    expect(result.ok).toBe(false);
    vi.useRealTimers();
  });

  it("rejects a legacy-shaped token without the typ claim — regression for the cross-token vulnerability", () => {
    // 2026-08-11 production incident: clinic session tokens and admin
    // session tokens shared a signing secret, and neither validator checked
    // a type claim, so a plain staff clinic token also validated as a
    // super-admin bearer. Both createClinicSessionToken and
    // validateClinicAccessBySlug must keep enforcing typ === "clinic".
    const base64UrlEncode = (value: string) =>
      Buffer.from(value)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    const legacyPayload = base64UrlEncode(
      JSON.stringify({
        sub: "personal1",
        clinic: "clinica-demo",
        role: "staff",
        // no `typ` field — this is the pre-fix shape.
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    const signature = createHmac("sha256", "test-secret")
      .update(legacyPayload)
      .digest("hex");

    return validateClinicAccessBySlug(
      "clinica-demo",
      fakeRequest(`${legacyPayload}.${signature}`)
    ).then((result) => {
      expect(result.ok).toBe(false);
    });
  });
});

describe("upsertClinicUser", () => {
  it("inserts a new user and returns the plaintext password once", async () => {
    let insertedRow: Record<string, unknown> | null = null;
    mockedGetSupabase.mockReturnValue({
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRow = row;
          return Promise.resolve({ data: null, error: null });
        },
      }),
    } as unknown as ReturnType<typeof getSupabaseServerClient>);

    const result = await upsertClinicUser({
      clinicId: "c1",
      username: "clinica-demo-staff",
      role: "staff",
      password: "chosen-password",
    });

    expect(result).toEqual({ username: "clinica-demo-staff", password: "chosen-password" });
    expect(insertedRow).toMatchObject({
      clinic_id: "c1",
      username: "clinica-demo-staff",
      role: "staff",
      is_active: true,
    });
    expect(
      await bcrypt.compare("chosen-password", insertedRow!.password_hash as string)
    ).toBe(true);
  });

  it("generates a random password when none is provided", async () => {
    mockedGetSupabase.mockReturnValue({
      from: () => ({
        insert: () => Promise.resolve({ data: null, error: null }),
      }),
    } as unknown as ReturnType<typeof getSupabaseServerClient>);

    const result = await upsertClinicUser({
      clinicId: "c1",
      username: "clinica-demo",
      role: "admin",
    });

    expect(result.password.length).toBeGreaterThan(0);
  });

  it("updates the password hash of an existing user instead of inserting", async () => {
    let updateCalled = false;
    mockedGetSupabase.mockReturnValue({
      from: () => ({
        update: () => {
          updateCalled = true;
          return {
            eq: () => Promise.resolve({ data: null, error: null }),
          };
        },
        insert: () => {
          throw new Error("should not insert when resetting an existing user");
        },
      }),
    } as unknown as ReturnType<typeof getSupabaseServerClient>);

    await upsertClinicUser({
      clinicId: "c1",
      username: "clinica-demo",
      role: "admin",
      existingUserId: "existing-id",
    });

    expect(updateCalled).toBe(true);
  });

  it("throws when the database insert fails", async () => {
    mockedGetSupabase.mockReturnValue({
      from: () => ({
        insert: () => Promise.resolve({ data: null, error: new Error("boom") }),
      }),
    } as unknown as ReturnType<typeof getSupabaseServerClient>);

    await expect(
      upsertClinicUser({ clinicId: "c1", username: "dup", role: "staff" })
    ).rejects.toThrow();
  });
});

describe("getPrimaryClinicAdmin", () => {
  it("returns the first admin-role account for a clinic", async () => {
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({
        clinic_users: {
          data: { id: "u1", username: "clinica-demo" },
          error: null,
        },
      })
    );

    const result = await getPrimaryClinicAdmin("c1");
    expect(result).toEqual({ id: "u1", username: "clinica-demo" });
  });

  it("returns null/undefined when the clinic has no admin account", async () => {
    mockedGetSupabase.mockReturnValue(
      makeSupabaseMock({ clinic_users: { data: null, error: null } })
    );

    const result = await getPrimaryClinicAdmin("c1");
    expect(result).toBeFalsy();
  });
});
