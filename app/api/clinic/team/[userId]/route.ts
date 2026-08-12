import { NextResponse } from "next/server";
import {
  getClinicUserById,
  setClinicUserActive,
  upsertClinicUser,
  validateClinicAccessBySlug,
} from "@/lib/clinics";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
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
    isActive?: unknown;
    regeneratePassword?: unknown;
  };
  const clinicSlug = typeof body.clinic === "string" ? body.clinic.trim() : "";

  if (!clinicSlug) {
    return NextResponse.json(
      { error: "Falta indicar la clinica." },
      { status: 400 }
    );
  }

  const auth = await validateClinicAccessBySlug(clinicSlug, request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (auth.session.role !== "admin") {
    return NextResponse.json(
      { error: "Solo un admin de la clinica puede gestionar el equipo." },
      { status: 403 }
    );
  }

  const { userId } = await context.params;
  const targetUser = await getClinicUserById(userId);

  if (!targetUser || targetUser.clinic_id !== auth.session.clinic.id) {
    return NextResponse.json(
      { error: "Cuenta no encontrada para esta clinica." },
      { status: 404 }
    );
  }

  try {
    if (typeof body.isActive === "boolean") {
      await setClinicUserActive(userId, body.isActive);
    }

    if (body.regeneratePassword === true) {
      const credentials = await upsertClinicUser({
        clinicId: auth.session.clinic.id,
        username: targetUser.username,
        role: targetUser.role,
        existingUserId: userId,
      });

      return NextResponse.json({
        username: credentials.username,
        password: credentials.password,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la cuenta." },
      { status: 500 }
    );
  }
}
