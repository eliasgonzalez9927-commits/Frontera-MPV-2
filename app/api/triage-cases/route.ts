import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  analyzeTriage,
  getPriorityLabel,
  getSourceLabel,
  normalizeSource,
} from "@/lib/triage";
import { mapRowToTriageCase, type TriageCaseRow } from "@/lib/triageCases";

export const dynamic = "force-dynamic";

function createCaseCode() {
  return `FR-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado para crear casos." },
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
    motivo?: unknown;
    evolucion?: unknown;
    intensidad?: unknown;
    sintomas?: unknown;
    source?: unknown;
  };

  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  const evolucion =
    typeof body.evolucion === "string" ? body.evolucion.trim() : "";
  const intensidad =
    typeof body.intensidad === "number" ? body.intensidad : undefined;
  const sintomas = Array.isArray(body.sintomas)
    ? body.sintomas.filter((item): item is string => typeof item === "string")
    : [];
  const source = normalizeSource(
    typeof body.source === "string" ? body.source : undefined
  );

  if (!motivo) {
    return NextResponse.json(
      { error: "El motivo de consulta es obligatorio." },
      { status: 400 }
    );
  }

  if (
    intensidad !== undefined &&
    (!Number.isInteger(intensidad) || intensidad < 1 || intensidad > 10)
  ) {
    return NextResponse.json(
      { error: "La intensidad debe estar entre 1 y 10." },
      { status: 400 }
    );
  }

  const result = analyzeTriage({
    motivo,
    evolucion,
    intensidad,
    sintomas,
    source,
  });
  const caseCode = createCaseCode();
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("triage_cases")
    .insert({
      case_code: caseCode,
      source,
      source_label: getSourceLabel(source),
      patient_label: result.patientLabel,
      chief_complaint: motivo,
      evolution: evolucion || null,
      intensity: intensidad ?? null,
      symptoms: sintomas,
      red_signals: result.redSignals,
      priority: result.priority,
      priority_label: getPriorityLabel(result.priority),
      recommendation: result.recommendation,
      handover: {
        ...result.handover,
        motivo,
        evolucion,
      },
      status: "waiting",
    })
    .select()
    .single<TriageCaseRow>();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo crear el caso de pre-triaje." },
      { status: 500 }
    );
  }

  const savedCase = mapRowToTriageCase(data);

  return NextResponse.json({
    caseCode: savedCase.caseCode,
    status: savedCase.status,
    case: savedCase,
  });
}
