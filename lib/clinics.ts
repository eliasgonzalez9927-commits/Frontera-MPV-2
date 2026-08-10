import "server-only";

import { createHash, timingSafeEqual } from "crypto";
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
  access_token: string | null;
  access_token_hash: string | null;
  is_active: boolean;
};

export type ClinicValidation =
  | { ok: true; clinic: ClinicPublic }
  | { ok: false; status: number; message: string };

function mapClinic(row: ClinicRow): ClinicPublic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
  };
}

export function hashClinicToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
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

export async function validateClinicTokenBySlug(
  slug: string,
  request: Request
): Promise<ClinicValidation> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return { ok: false, status: 400, message: "El slug de clinica es obligatorio." };
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Token clinico invalido o ausente." };
  }

  const providedToken = authorization.slice("Bearer ".length).trim();

  if (!providedToken) {
    return { ok: false, status: 401, message: "Token clinico invalido o ausente." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("id,name,slug,access_token,access_token_hash,is_active")
    .eq("slug", normalizedSlug)
    .maybeSingle<ClinicRow>();

  if (error || !data || !data.is_active) {
    return {
      ok: false,
      status: 404,
      message: "Clinica no encontrada o inactiva.",
    };
  }

  const isHashValid = data.access_token_hash
    ? safeEqual(hashClinicToken(providedToken), data.access_token_hash)
    : false;
  const isLegacyTokenValid = data.access_token
    ? safeEqual(providedToken, data.access_token)
    : false;

  if (!isHashValid && !isLegacyTokenValid) {
    return { ok: false, status: 401, message: "Token clinico invalido o ausente." };
  }

  return { ok: true, clinic: mapClinic(data) };
}
