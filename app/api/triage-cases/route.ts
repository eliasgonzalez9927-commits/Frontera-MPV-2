import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  analyzeTriage,
  getPriorityLabel,
  getSourceLabel,
  normalizeSource,
} from "@/lib/triage";
import { getActiveClinicBySlug } from "@/lib/clinics";
import {
  getOrientationMessage,
  isUsefulChiefComplaint,
  normalizeEntryMode,
} from "@/lib/triageConversation";
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
    redFlags?: unknown;
    redFlagAnswers?: unknown;
    patientContext?: unknown;
    estimatedPriorityReason?: unknown;
    flowVersion?: unknown;
    entryMode?: unknown;
    orientationIntent?: unknown;
    orientationMessage?: unknown;
    source?: unknown;
    clinic?: unknown;
    clinic_slug?: unknown;
  };

  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  const evolucion =
    typeof body.evolucion === "string" ? body.evolucion.trim() : "";
  const intensidad =
    typeof body.intensidad === "number" ? body.intensidad : undefined;
  const sintomas = Array.isArray(body.sintomas)
    ? body.sintomas.filter((item): item is string => typeof item === "string")
    : [];
  const redFlags = Array.isArray(body.redFlags)
    ? body.redFlags.filter((item): item is string => typeof item === "string")
    : [];
  const redFlagAnswers = Array.isArray(body.redFlagAnswers)
    ? body.redFlagAnswers
    : [];
  const patientContext =
    typeof body.patientContext === "string" ? body.patientContext : undefined;
  const estimatedPriorityReason =
    typeof body.estimatedPriorityReason === "string"
      ? body.estimatedPriorityReason
      : undefined;
  const flowVersion =
    typeof body.flowVersion === "string" ? body.flowVersion : undefined;
  const submittedSource = normalizeSource(
    typeof body.source === "string" ? body.source : undefined
  );
  const clinicSlug =
    typeof body.clinic === "string"
      ? body.clinic.trim()
      : typeof body.clinic_slug === "string"
        ? body.clinic_slug.trim()
        : "";
  const source = clinicSlug ? submittedSource : "web";
  const entryMode = normalizeEntryMode(body.entryMode, Boolean(clinicSlug));
  const orientationIntent =
    body.orientationIntent === true || entryMode === "needs_orientation";
  const submittedOrientationMessage =
    typeof body.orientationMessage === "string"
      ? body.orientationMessage.trim()
      : undefined;

  if (!motivo) {
    return NextResponse.json(
      { error: "El motivo de consulta es obligatorio." },
      { status: 400 }
    );
  }

  if (!isUsefulChiefComplaint(motivo)) {
    return NextResponse.json(
      { error: "Necesitamos una descripcion mas clara para poder orientarte." },
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
    redFlags,
    source,
  });
  const caseCode = createCaseCode();

  try {
    const supabase = getSupabaseServerClient();
    const clinicResult = clinicSlug
      ? await getActiveClinicBySlug(clinicSlug)
      : null;

    if (clinicResult && !clinicResult.ok) {
      return NextResponse.json(
        { error: "Clinica no encontrada o inactiva." },
        { status: 400 }
      );
    }

    const clinic = clinicResult?.ok ? clinicResult.clinic : null;
    const orientationMessage = orientationIntent
      ? submittedOrientationMessage || getOrientationMessage(result.priority)
      : undefined;

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
        clinic_id: clinic?.id ?? null,
        clinic_slug: clinic?.slug ?? null,
        handover: {
          ...result.handover,
          motivo,
          evolucion: evolucion || undefined,
          patientContext,
          redFlagAnswers,
          flowVersion,
          estimatedPriorityReason,
          entryMode,
          orientationIntent,
          orientationMessage,
        },
        status: "waiting",
      })
      .select("*, clinics(name,slug)")
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
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear el caso de pre-triaje." },
      { status: 500 }
    );
  }
}
