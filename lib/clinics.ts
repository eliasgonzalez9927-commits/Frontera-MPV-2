import "server-only";

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
  access_token: string;
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
    .select("id,name,slug,access_token,is_active")
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

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("id,name,slug,access_token,is_active")
    .eq("slug", normalizedSlug)
    .maybeSingle<ClinicRow>();

  if (error || !data || !data.is_active) {
    return {
      ok: false,
      status: 404,
      message: "Clinica no encontrada o inactiva.",
    };
  }

  if (authorization !== `Bearer ${data.access_token}`) {
    return { ok: false, status: 401, message: "Token clinico invalido o ausente." };
  }

  return { ok: true, clinic: mapClinic(data) };
}
