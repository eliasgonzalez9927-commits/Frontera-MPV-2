import { NextResponse } from "next/server";
import { validateClinicTokenBySlug } from "@/lib/clinics";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  mapRowToTriageCase,
  sortTriageCases,
  type TriageCaseRow,
} from "@/lib/triageCases";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado para listar casos." },
      { status: 503 }
    );
  }

  try {
    const clinicSlug = new URL(request.url).searchParams.get("clinic")?.trim();

    if (!clinicSlug) {
      return NextResponse.json(
        { error: "Falta indicar la clinica." },
        { status: 400 }
      );
    }

    const clinicAuth = await validateClinicTokenBySlug(clinicSlug, request);

    if (!clinicAuth.ok) {
      return NextResponse.json(
        { error: clinicAuth.message },
        { status: clinicAuth.status }
      );
    }

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("triage_cases")
      .select("*, clinics(name,slug)")
      .order("created_at", { ascending: false })
      .eq("clinic_id", clinicAuth.clinic.id);

    const { data, error } = await query.returns<TriageCaseRow[]>();

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
