import { NextResponse } from "next/server";
import { validateClinicSessionBySlug } from "@/lib/clinics";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  allowedStatuses,
  mapRowToTriageCase,
  type CaseStatus,
  type TriageCaseRow,
} from "@/lib/triageCases";

export const dynamic = "force-dynamic";

async function getCase(caseCode: string, clinicId?: string) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("triage_cases")
    .select("*, clinics(name,slug)")
    .eq("case_code", caseCode);

  if (clinicId) {
    query = query.eq("clinic_id", clinicId);
  }

  return query.single<TriageCaseRow>();
}

async function validateClinicScope(request: Request) {
  const clinicSlug = new URL(request.url).searchParams.get("clinic")?.trim();

  if (!clinicSlug) {
    return {
      ok: false as const,
      status: 400,
      message: "Falta indicar la clinica.",
    };
  }

  return validateClinicSessionBySlug(clinicSlug, request);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ caseCode: string }> }
) {
  const auth = await validateClinicScope(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado para leer casos." },
      { status: 503 }
    );
  }

  const { caseCode } = await context.params;

  if (!caseCode) {
    return NextResponse.json(
      { error: "El codigo de caso es obligatorio." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await getCase(caseCode, auth.clinic?.id);

    if (error || !data) {
      return NextResponse.json({ error: "Caso no encontrado para esta clinica." }, { status: 404 });
    }

    return NextResponse.json({ case: mapRowToTriageCase(data) });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar el caso." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ caseCode: string }> }
) {
  const auth = await validateClinicScope(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado para actualizar casos." },
      { status: 503 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const status = (payload as { status?: unknown }).status;

  if (
    typeof status !== "string" ||
    !allowedStatuses.includes(status as CaseStatus)
  ) {
    return NextResponse.json({ error: "Status invalido." }, { status: 400 });
  }

  const { caseCode } = await context.params;

  if (!caseCode) {
    return NextResponse.json(
      { error: "El codigo de caso es obligatorio." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("triage_cases")
      .update({ status })
      .eq("case_code", caseCode);

    if (auth.clinic?.id) {
      query = query.eq("clinic_id", auth.clinic.id);
    }

    const { data, error } = await query
      .select("*, clinics(name,slug)")
      .single<TriageCaseRow>();

    if (error || !data) {
      return NextResponse.json(
        { error: "No se pudo actualizar el caso para esta clinica." },
        { status: 404 }
      );
    }

    return NextResponse.json({ case: mapRowToTriageCase(data) });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar el caso." },
      { status: 500 }
    );
  }
}
