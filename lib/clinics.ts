import "server-only";

import bcrypt from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { validateAdminAuthorization } from "@/lib/adminAuth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ClinicRole = "admin" | "staff";

export type ClinicPublic = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type ClinicSession = {
  clinic: ClinicPublic;
  username: string;
  role: ClinicRole;
  /** True when this session came from the super-admin bypass, not a real clinic login. */
  isSuperAdmin: boolean;
};

type ClinicRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type ClinicUserRow = {
  id: string;
  clinic_id: string;
  username: string;
  password_hash: string;
  role: ClinicRole;
  is_active: boolean;
  created_at: string;
  clinics: ClinicRow | null;
};

export type ClinicValidation =
  | { ok: true; clinic: ClinicPublic }
  | { ok: false; status: number; message: string };

export type ClinicSessionValidation =
  | { ok: true; session: ClinicSession }
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
// just easy to read off a screen and type once when an account is created.
export function generateClinicPassword() {
  return randomBytes(6).toString("base64url");
}

export async function hashClinicPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function createClinicSessionToken(
  slug: string,
  username: string,
  role: ClinicRole
) {
  const expiresAt = Math.floor(Date.now() / 1000) + clinicSessionTtlSeconds;
  const payload = base64UrlEncode(
    JSON.stringify({ sub: username, clinic: slug, role, exp: expiresAt })
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
 * Creates (or resets) a clinic team account. Called from the admin panel
 * (creating a clinic's first "admin" account) or from a clinic admin adding
 * staff. The plaintext password is returned once so it can be shown/copied.
 */
export async function upsertClinicUser(params: {
  clinicId: string;
  username: string;
  role: ClinicRole;
  password?: string;
  existingUserId?: string;
}) {
  const finalPassword = params.password?.trim() || generateClinicPassword();
  const passwordHash = await hashClinicPassword(finalPassword);
  const supabase = getSupabaseServerClient();

  if (params.existingUserId) {
    const { error } = await supabase
      .from("clinic_users")
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", params.existingUserId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("clinic_users").insert({
      clinic_id: params.clinicId,
      username: params.username,
      password_hash: passwordHash,
      role: params.role,
      is_active: true,
    });

    if (error) {
      throw error;
    }
  }

  return { username: params.username, password: finalPassword };
}

export async function listClinicUsers(clinicId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_users")
    .select("id,username,role,is_active,created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data as Array<{
    id: string;
    username: string;
    role: ClinicRole;
    is_active: boolean;
    created_at: string;
  }>;
}

/** The first ("primary") admin-role account for a clinic, if any. */
export async function getPrimaryClinicAdmin(clinicId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("clinic_users")
    .select("id,username")
    .eq("clinic_id", clinicId)
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; username: string }>();

  return data;
}

export async function getClinicUserById(userId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_users")
    .select("id,clinic_id,username,role,is_active")
    .eq("id", userId)
    .maybeSingle<{
      id: string;
      clinic_id: string;
      username: string;
      role: ClinicRole;
      is_active: boolean;
    }>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function setClinicUserActive(userId: string, isActive: boolean) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("clinic_users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

export async function validateClinicCredentials(
  username: string,
  password: string
): Promise<ClinicSessionValidation> {
  if (!username || !password) {
    return {
      ok: false,
      status: 400,
      message: "Usuario y contrasena son obligatorios.",
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_users")
    .select("id,clinic_id,username,password_hash,role,is_active,clinics(id,name,slug,is_active)")
    .eq("username", username.trim())
    .maybeSingle<ClinicUserRow>();

  if (error || !data || !data.is_active || !data.clinics?.is_active) {
    return { ok: false, status: 401, message: "Usuario o contrasena incorrectos." };
  }

  const passwordOk = await bcrypt.compare(password, data.password_hash);

  if (!passwordOk) {
    return { ok: false, status: 401, message: "Usuario o contrasena incorrectos." };
  }

  return {
    ok: true,
    session: {
      clinic: mapClinic(data.clinics),
      username: data.username,
      role: data.role,
      isSuperAdmin: false,
    },
  };
}

/**
 * Validates access to a specific clinic's data. Accepts either:
 * 1. A super-admin bearer token (the founder's account) — bypasses any
 *    per-clinic login, scoped to any clinic.
 * 2. A signed clinic session token whose `clinic` claim matches the
 *    requested slug.
 */
export async function validateClinicAccessBySlug(
  slug: string,
  request: Request
): Promise<ClinicSessionValidation> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return { ok: false, status: 400, message: "El slug de clinica es obligatorio." };
  }

  const adminAuth = validateAdminAuthorization(request);

  if (adminAuth.ok) {
    const clinicResult = await getActiveClinicBySlug(normalizedSlug);

    if (!clinicResult.ok) {
      return clinicResult;
    }

    return {
      ok: true,
      session: {
        clinic: clinicResult.clinic,
        username: "admin",
        role: "admin",
        isSuperAdmin: true,
      },
    };
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

  let session: { sub?: unknown; clinic?: unknown; role?: unknown; exp?: unknown };

  try {
    session = JSON.parse(base64UrlDecode(payload));
  } catch {
    return { ok: false, status: 401, message: "Sesion de clinica invalida." };
  }

  if (
    typeof session.clinic !== "string" ||
    session.clinic !== normalizedSlug ||
    typeof session.sub !== "string" ||
    (session.role !== "admin" && session.role !== "staff") ||
    typeof session.exp !== "number" ||
    session.exp < Math.floor(Date.now() / 1000)
  ) {
    return {
      ok: false,
      status: 401,
      message: "Sesion de clinica invalida o vencida.",
    };
  }

  const clinicResult = await getActiveClinicBySlug(normalizedSlug);

  if (!clinicResult.ok) {
    return clinicResult;
  }

  return {
    ok: true,
    session: {
      clinic: clinicResult.clinic,
      username: session.sub,
      role: session.role,
      isSuperAdmin: false,
    },
  };
}
