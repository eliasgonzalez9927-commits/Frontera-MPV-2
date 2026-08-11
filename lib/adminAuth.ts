import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const adminSessionTtlSeconds = 60 * 60 * 12;

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string) {
  const secret = getAdminSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function isAdminLoginConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function validateAdminCredentials(username: string, password: string) {
  const configuredUsername = process.env.ADMIN_USERNAME || "admin";
  const configuredPassword = process.env.ADMIN_PASSWORD || "";

  if (!configuredPassword) {
    return false;
  }

  return (
    safeEqual(username, configuredUsername) &&
    safeEqual(password, configuredPassword)
  );
}

export function createAdminSessionToken(username: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + adminSessionTtlSeconds;
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: username,
      exp: expiresAt,
    })
  );
  const signature = sign(payload);

  if (!signature) {
    return null;
  }

  return {
    token: `${payload}.${signature}`,
    expiresAt,
  };
}

export function validateAdminAuthorization(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      message: "Usuario o contrasena de admin requeridos.",
    };
  }

  const providedToken = authorization.slice("Bearer ".length).trim();
  const [payload, signature] = providedToken.split(".");

  if (!payload || !signature) {
    return {
      ok: false,
      status: 401,
      message: "Sesion de admin invalida.",
    };
  }

  const expectedSignature = sign(payload);

  if (!expectedSignature || !safeEqual(signature, expectedSignature)) {
    return {
      ok: false,
      status: 401,
      message: "Sesion de admin invalida.",
    };
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as {
      sub?: unknown;
      exp?: unknown;
    };

    if (
      typeof session.sub !== "string" ||
      typeof session.exp !== "number" ||
      session.exp < Math.floor(Date.now() / 1000)
    ) {
      return {
        ok: false,
        status: 401,
        message: "Sesion de admin vencida.",
      };
    }

    return { ok: true, status: 200, message: "OK" };
  } catch {
    return {
      ok: false,
      status: 401,
      message: "Sesion de admin invalida.",
    };
  }
}
