import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { mapRowToTriageCase, type TriageCaseRow } from "@/lib/triageCases";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseCode: string }> }
) {
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
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("triage_cases")
      .select()
      .eq("case_code", caseCode)
      .single<TriageCaseRow>();

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
