import { NextResponse } from "next/server";
import { createClinicSessionToken, validateClinicCredentials } from "@/lib/clinics";
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

  const body = payload as { username?: unknown; password?: unknown };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Usuario y contrasena son obligatorios." },
      { status: 400 }
    );
  }

  const result = await validateClinicCredentials(username, password);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const session = createClinicSessionToken(
    result.session.clinic.slug,
    result.session.username,
    result.session.role
  );

  if (!session) {
    return NextResponse.json(
      { error: "No se pudo crear la sesion de clinica." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clinicToken: session.token,
    expiresAt: session.expiresAt,
    clinic: result.session.clinic,
    role: result.session.role,
  });
}
