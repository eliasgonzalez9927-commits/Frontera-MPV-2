import { NextResponse } from "next/server";
import { validateAdminAuthorization } from "@/lib/adminAuth";
import { setClinicCredentials } from "@/lib/clinics";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ClinicAdminRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  username: string | null;
  password_hash: string | null;
};

function mapClinic(row: ClinicAdminRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasLogin: Boolean(row.username && row.password_hash),
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
    regeneratePassword?: unknown;
  };
  const updates: Record<string, boolean> = {};

  if (typeof body.isActive === "boolean") {
    updates.is_active = body.isActive;
  }

  const { slug } = await context.params;
  let credentials: { username: string; password: string } | undefined;

  if (body.regeneratePassword === true) {
    credentials = await setClinicCredentials(slug);
  }

  if (Object.keys(updates).length === 0 && !credentials) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();

    if (Object.keys(updates).length === 0) {
      // Only the password changed — still fetch the row to return fresh data.
      const { data, error } = await supabase
        .from("clinics")
        .select("id,name,slug,is_active,created_at,updated_at,username,password_hash")
        .eq("slug", slug)
        .single<ClinicAdminRow>();

      if (error || !data) {
        return NextResponse.json(
          { error: "No se pudo actualizar la clinica." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        clinic: mapClinic(data),
        clinicUsername: credentials?.username,
        clinicPassword: credentials?.password,
      });
    }

    const { data, error } = await supabase
      .from("clinics")
      .update(updates)
      .eq("slug", slug)
      .select("id,name,slug,is_active,created_at,updated_at,username,password_hash")
      .single<ClinicAdminRow>();

    if (error || !data) {
      return NextResponse.json(
        { error: "No se pudo actualizar la clinica." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      clinic: mapClinic(data),
      clinicUsername: credentials?.username,
      clinicPassword: credentials?.password,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la clinica." },
      { status: 500 }
    );
  }
}
