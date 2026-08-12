import "server-only";

import bcrypt from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ClinicPublic = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type ClinicRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type ClinicAuthRow = ClinicRow & {
  username: string | null;
  password_hash: string | null;
};

export type ClinicValidation =
  | { ok: true; clinic: ClinicPublic }
  | { ok: false; status: number; message: string };

const clinicSessionTtlSeconds = 60 * 60 * 12;

function mapClinic(row: ClinicRow): ClinicPublic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
  };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

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

function getClinicSessionSecret() {
  return (
    process.env.CLINIC_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || ""
  );
}

function sign(payload: string) {
  const secret = getClinicSessionSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update(payload).digest("hex");
}

// Readable, url-safe random password — not meant to be memorized long-term,
// just easy to read off a screen and type once when the clinic sets it up.
export function generateClinicPassword() {
  return randomBytes(6).toString("base64url");
}

export function buildClinicUsername(slug: string) {
  return slug;
}

export async function hashClinicPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function createClinicSessionToken(slug: string, username: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + clinicSessionTtlSeconds;
  const payload = base64UrlEncode(
    JSON.stringify({ sub: username, clinic: slug, exp: expiresAt })
  );
  const signature = sign(payload);

  if (!signature) {
    return null;
  }

  return { token: `${payload}.${signature}`, expiresAt };
}

export async function getActiveClinicBySlug(
  slug: string
): Promise<ClinicValidation> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return { ok: false, status: 400, message: "El slug de clinica es obligatorio." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("id,name,slug,is_active")
    .eq("slug", normalizedSlug)
    .maybeSingle<ClinicRow>();

  if (error || !data || !data.is_active) {
    return {
      ok: false,
      status: 404,
      message: "Clinica no encontrada o inactiva.",
    };
  }

  return { ok: true, clinic: mapClinic(data) };
}

/**
 * Sets (or resets) a clinic's login. Called from the admin panel — the
 * plaintext password is returned once so it can be shown/copied, then only
 * the bcrypt hash is kept in the database.
 */
export async function setClinicCredentials(slug: string, password?: string) {
  const username = buildClinicUsername(slug);
  const finalPassword = password?.trim() || generateClinicPassword();
  const passwordHash = await hashClinicPassword(finalPassword);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("clinics")
    .update({ username, password_hash: passwordHash })
    .eq("slug", slug);

  if (error) {
    throw error;
  }

  return { username, password: finalPassword };
}

export async function validateClinicCredentials(
  slug: string,
  username: string,
  password: string
): Promise<ClinicValidation> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug || !username || !password) {
    return {
      ok: false,
      status: 400,
      message: "Usuario y contrasena son obligatorios.",
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("id,name,slug,is_active,username,password_hash")
    .eq("slug", normalizedSlug)
    .maybeSingle<ClinicAuthRow>();

  if (error || !data || !data.is_active) {
    return {
      ok: false,
      status: 404,
      message: "Clinica no encontrada o inactiva.",
    };
  }

  if (!data.username || !data.password_hash) {
    return {
      ok: false,
      status: 401,
      message: "Esta clinica todavia no tiene usuario y contrasena configurados.",
    };
  }

  const usernameOk = safeEqual(username.trim(), data.username);
  const passwordOk = await bcrypt.compare(password, data.password_hash);

  if (!usernameOk || !passwordOk) {
    return { ok: false, status: 401, message: "Usuario o contrasena incorrectos." };
  }

  return { ok: true, clinic: mapClinic(data) };
}

/**
 * Validates the signed session token issued by /api/clinic/login — this is
 * what actually gates /api/clinic/cases, not the raw password on every
 * request.
 */
export async function validateClinicSessionBySlug(
  slug: string,
  request: Request
): Promise<ClinicValidation> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return { ok: false, status: 400, message: "El slug de clinica es obligatorio." };
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      message: "Sesion de clinica invalida o ausente.",
    };
  }

  const providedToken = authorization.slice("Bearer ".length).trim();
  const [payload, signature] = providedToken.split(".");

  if (!payload || !signature) {
    return { ok: false, status: 401, message: "Sesion de clinica invalida." };
  }

  const expectedSignature = sign(payload);

  if (!expectedSignature || !safeEqual(signature, expectedSignature)) {
    return { ok: false, status: 401, message: "Sesion de clinica invalida." };
  }

  let session: { sub?: unknown; clinic?: unknown; exp?: unknown };

  try {
    session = JSON.parse(base64UrlDecode(payload));
  } catch {
    return { ok: false, status: 401, message: "Sesion de clinica invalida." };
  }

  if (
    typeof session.clinic !== "string" ||
    session.clinic !== normalizedSlug ||
    typeof session.exp !== "number" ||
    session.exp < Math.floor(Date.now() / 1000)
  ) {
    return {
      ok: false,
      status: 401,
      message: "Sesion de clinica invalida o vencida.",
    };
  }

  return getActiveClinicBySlug(normalizedSlug);
}
