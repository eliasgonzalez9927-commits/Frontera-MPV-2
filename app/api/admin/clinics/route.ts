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

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

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

export async function GET(request: Request) {
  const authError = validateAdmin(request);

  if (authError) {
    return authError;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("clinics")
      .select("id,name,slug,is_active,created_at,updated_at,username,password_hash")
      .order("created_at", { ascending: false })
      .returns<ClinicAdminRow[]>();

    if (error) {
      return NextResponse.json(
        { error: "No se pudieron cargar las clinicas." },
        { status: 500 }
      );
    }

    return NextResponse.json({ clinics: data.map(mapClinic) });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar las clinicas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    name?: unknown;
    slug?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = normalizeSlug(typeof body.slug === "string" ? body.slug : "");

  if (name.length < 3) {
    return NextResponse.json(
      { error: "El nombre de la clinica es obligatorio." },
      { status: 400 }
    );
  }

  if (slug.length < 3) {
    return NextResponse.json(
      { error: "El slug de la clinica es obligatorio." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("clinics")
      .insert({
        name,
        slug,
        is_active: true,
      })
      .select("id,name,slug,is_active,created_at,updated_at,username,password_hash")
      .single<ClinicAdminRow>();

    if (error || !data) {
      return NextResponse.json(
        { error: "No se pudo crear la clinica. Revisá si el slug ya existe." },
        { status: 400 }
      );
    }

    const credentials = await setClinicCredentials(slug);

    return NextResponse.json({
      clinic: { ...mapClinic(data), hasLogin: true },
      clinicUsername: credentials.username,
      clinicPassword: credentials.password,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la clinica." },
      { status: 500 }
    );
  }
}
