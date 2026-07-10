import { NextResponse } from "next/server";
import { validateClinicAuthorization } from "@/lib/clinicAuth";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  mapRowToTriageCase,
  sortTriageCases,
  type TriageCaseRow,
} from "@/lib/triageCases";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = validateClinicAuthorization(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado para listar casos." },
      { status: 503 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("triage_cases")
      .select()
      .order("created_at", { ascending: false })
      .returns<TriageCaseRow[]>();

    if (error) {
      return NextResponse.json(
        { error: "No se pudieron cargar los casos." },
        { status: 500 }
      );
    }

    const cases = sortTriageCases(data.map(mapRowToTriageCase));

    return NextResponse.json({ cases });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los casos." },
      { status: 500 }
    );
  }
}
