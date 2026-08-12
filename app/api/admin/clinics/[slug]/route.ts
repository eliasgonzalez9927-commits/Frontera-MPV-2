import { NextResponse } from "next/server";
import { validateAdminAuthorization } from "@/lib/adminAuth";
import { getPrimaryClinicAdmin, upsertClinicUser } from "@/lib/clinics";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ClinicAdminRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapClinic(row: ClinicAdminRow, hasLogin: boolean) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasLogin,
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

  try {
    const supabase = getSupabaseServerClient();
    let data: ClinicAdminRow | null = null;

    if (Object.keys(updates).length > 0) {
      const result = await supabase
        .from("clinics")
        .update(updates)
        .eq("slug", slug)
        .select("id,name,slug,is_active,created_at,updated_at")
        .single<ClinicAdminRow>();

      if (result.error || !result.data) {
        return NextResponse.json(
          { error: "No se pudo actualizar la clinica." },
          { status: 404 }
        );
      }

      data = result.data;
    } else {
      const result = await supabase
        .from("clinics")
        .select("id,name,slug,is_active,created_at,updated_at")
        .eq("slug", slug)
        .single<ClinicAdminRow>();

      if (result.error || !result.data) {
        return NextResponse.json(
          { error: "No se pudo actualizar la clinica." },
          { status: 404 }
        );
      }

      data = result.data;
    }

    let credentials: { username: string; password: string } | undefined;

    if (body.regeneratePassword === true) {
      const primaryAdmin = await getPrimaryClinicAdmin(data.id);
      credentials = await upsertClinicUser({
        clinicId: data.id,
        username: primaryAdmin?.username ?? slug,
        role: "admin",
        existingUserId: primaryAdmin?.id,
      });
    }

    const hasLogin = Boolean(
      credentials || (await getPrimaryClinicAdmin(data.id))
    );

    return NextResponse.json({
      clinic: mapClinic(data, hasLogin),
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
