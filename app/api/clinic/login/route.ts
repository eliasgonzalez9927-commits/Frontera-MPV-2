import { NextResponse } from "next/server";
import {
  createClinicSessionToken,
  validateClinicCredentials,
} from "@/lib/clinics";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    password?: unknown;
  };
  const slug = typeof body.clinic === "string" ? body.clinic.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!slug || !username || !password) {
    return NextResponse.json(
      { error: "Clinica, usuario y contrasena son obligatorios." },
      { status: 400 }
    );
  }

  const result = await validateClinicCredentials(slug, username, password);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const session = createClinicSessionToken(slug, username);

  if (!session) {
    return NextResponse.json(
      { error: "No se pudo crear la sesion de clinica." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clinicToken: session.token,
    expiresAt: session.expiresAt,
    clinic: result.clinic,
  });
}
