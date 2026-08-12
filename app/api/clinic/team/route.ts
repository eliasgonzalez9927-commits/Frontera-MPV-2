import { NextResponse } from "next/server";
import {
  listClinicUsers,
  upsertClinicUser,
  validateClinicAccessBySlug,
} from "@/lib/clinics";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireClinicAdmin(clinicSlug: string, request: Request) {
  const auth = await validateClinicAccessBySlug(clinicSlug, request);

  if (!auth.ok) {
    return { ok: false as const, status: auth.status, message: auth.message };
  }

  if (auth.session.role !== "admin") {
    return {
      ok: false as const,
      status: 403,
      message: "Solo un admin de la clinica puede gestionar el equipo.",
    };
  }

  return { ok: true as const, session: auth.session };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado." },
      { status: 503 }
    );
  }

  const clinicSlug = new URL(request.url).searchParams.get("clinic")?.trim();

  if (!clinicSlug) {
    return NextResponse.json(
      { error: "Falta indicar la clinica." },
      { status: 400 }
    );
  }

  const auth = await requireClinicAdmin(clinicSlug, request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const users = await listClinicUsers(auth.session.clinic.id);

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar el equipo." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado." },
      { status: 503 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const body = payload as {
    clinic?: unknown;
    username?: unknown;
    role?: unknown;
  };
  const clinicSlug = typeof body.clinic === "string" ? body.clinic.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const role = body.role === "admin" ? "admin" : "staff";

  if (!clinicSlug) {
    return NextResponse.json(
      { error: "Falta indicar la clinica." },
      { status: 400 }
    );
  }

  if (username.length < 3) {
    return NextResponse.json(
      { error: "El usuario debe tener al menos 3 caracteres." },
      { status: 400 }
    );
  }

  const auth = await requireClinicAdmin(clinicSlug, request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const credentials = await upsertClinicUser({
      clinicId: auth.session.clinic.id,
      username,
      role,
    });

    return NextResponse.json({
      username: credentials.username,
      password: credentials.password,
      role,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la cuenta. Revisá si el usuario ya existe." },
      { status: 400 }
    );
  }
}
