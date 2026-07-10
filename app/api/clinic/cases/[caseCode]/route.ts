import { NextResponse } from "next/server";
import { validateClinicAuthorization } from "@/lib/clinicAuth";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  allowedStatuses,
  mapRowToTriageCase,
  type CaseStatus,
  type TriageCaseRow,
} from "@/lib/triageCases";

export const dynamic = "force-dynamic";

async function getCase(caseCode: string) {
  const supabase = getSupabaseServerClient();

  return supabase
    .from("triage_cases")
    .select()
    .eq("case_code", caseCode)
    .single<TriageCaseRow>();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ caseCode: string }> }
) {
  const auth = validateClinicAuthorization(request);

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
    const { data, error } = await getCase(caseCode);

    if (error || !data) {
      return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
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
  const auth = validateClinicAuthorization(request);

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
    const { data, error } = await supabase
      .from("triage_cases")
      .update({ status })
      .eq("case_code", caseCode)
      .select()
      .single<TriageCaseRow>();

    if (error || !data) {
      return NextResponse.json(
        { error: "No se pudo actualizar el caso." },
        { status: 500 }
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
