import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { validateAdminAuthorization } from "@/lib/adminAuth";
import { hashClinicToken } from "@/lib/clinics";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ClinicAdminRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  access_token: string | null;
  access_token_hash: string | null;
};

function generateClinicToken() {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function mapClinic(row: ClinicAdminRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasHashedToken: Boolean(row.access_token_hash),
    hasLegacyToken: Boolean(row.access_token),
  };
}

function validateAdmin(request: Request) {
  const auth = validateAdminAuthorization(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado para administrar clinicas." },
      { status: 503 }
    );
  }

  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const authError = validateAdmin(request);

  if (authError) {
    return authError;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const body = payload as {
    isActive?: unknown;
    regenerateToken?: unknown;
  };
  const updates: Record<string, string | boolean | null> = {};
  let clinicAccessToken: string | undefined;

  if (typeof body.isActive === "boolean") {
    updates.is_active = body.isActive;
  }

  if (body.regenerateToken === true) {
    clinicAccessToken = generateClinicToken();
    updates.access_token = null;
    updates.access_token_hash = hashClinicToken(clinicAccessToken);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar." },
      { status: 400 }
    );
  }

  const { slug } = await context.params;

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("clinics")
      .update(updates)
      .eq("slug", slug)
      .select("id,name,slug,is_active,created_at,updated_at,access_token,access_token_hash")
      .single<ClinicAdminRow>();

    if (error || !data) {
      return NextResponse.json(
        { error: "No se pudo actualizar la clinica." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      clinic: mapClinic(data),
      clinicAccessToken,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la clinica." },
      { status: 500 }
    );
  }
}
