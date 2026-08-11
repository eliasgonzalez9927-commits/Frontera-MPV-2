export type Priority = "ROJO" | "NARANJA" | "AMARILLO" | "VERDE" | "AZUL";
export type TriageSource = "web" | "qr" | "whatsapp";

export type TriageInput = {
  motivo: string;
  nombre?: string;
  intensidad?: number;
  evolucion?: string;
  sintomas?: string[];
  redFlags?: string[];
  urgentSignals?: string[];
  source?: TriageSource;
};

export type TriageResult = {
  id: string;
  caseCode: string;
  patientLabel: string;
  source: TriageSource;
  sourceLabel: string;
  priority: Priority;
  title: string;
  recommendation: string;
  redSignals: string[];
  handover: {
    motivo: string;
    prioridad: Priority;
    senalesDetectadas: string[];
    senalesUrgentes?: string[];
    evolucion?: string;
    sintomasAdicionales: string[];
    patientContext?: string;
    redFlagAnswers?: unknown;
    flowVersion?: string;
    estimatedPriorityReason?: string;
    entryMode?: string;
    orientationIntent?: boolean;
    orientationMessage?: string;
  };
  createdAt: string;
};

export function normalizeSource(value?: string | null): TriageSource {
  if (value === "qr" || value === "whatsapp" || value === "web") {
    return value;
  }

  return "web";
}

export function getSourceLabel(source: TriageSource) {
  const labels: Record<TriageSource, string> = {
    web: "Entrada web",
    qr: "Entrada QR de guardia",
    whatsapp: "Entrada WhatsApp",
  };

  return labels[source];
}

const RED_SIGNAL_KEYWORDS = [
  "dolor de pecho",
  "pecho intenso",
  "no puedo respirar",
  "me cuesta respirar",
  "dificultad respiratoria",
  "falta de aire severa",
  "perdida de conocimiento",
  "pérdida de conocimiento",
  "me desmaye",
  "me desmayé",
  "sangrado abundante",
  "hemorragia",
  "convulsion",
  "convulsión",
  "acv",
  "cara torcida",
  "no puedo hablar",
  "debilidad en un lado",
  "me quiero matar",
  "suicidio",
  "riesgo vital",
  "trauma grave",
  "choque fuerte",
];

const WARNING_KEYWORDS = [
  "fiebre",
  "vomito",
  "vómito",
  "vomitos",
  "vómitos",
  "sangrado",
  "dolor fuerte",
  "mareo",
  "deshidratacion",
  "deshidratación",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const NEGATION_WORDS = [
  "sin",
  "no",
  "nunca",
  "jamas",
  "niega",
  "ningun",
  "ninguna",
  "tampoco",
];

// Splits on sentence/clause boundaries so a negation in one clause ("sin
// fiebre") never leaks into an unrelated later clause that happens to share
// a keyword.
function splitIntoClauses(text: string) {
  return text.split(/[.,;\n]+|\by\b|\bpero\b/g);
}

function clauseMatchesUnnegated(clause: string, keyword: string) {
  const index = clause.indexOf(keyword);

  if (index === -1) {
    return false;
  }

  const preceding = clause.slice(0, index);
  const isNegated = NEGATION_WORDS.some((word) =>
    new RegExp(`(^|\\s)${word}(\\s|$)`).test(preceding)
  );

  return !isNegated;
}

// Plain substring matching can't tell "dolor de pecho" from "sin dolor de
// pecho" — this checks each clause individually so a negated mention never
// counts as a positive symptom/red flag.
function keywordAppearsUnnegated(text: string, keyword: string) {
  return splitIntoClauses(text).some((clause) =>
    clauseMatchesUnnegated(clause, keyword)
  );
}

function detectRedSignals(text: string, symptoms: string[]) {
  const normalized = normalizeText(`${text} . ${symptoms.join(" . ")}`);

  return RED_SIGNAL_KEYWORDS.filter((keyword) =>
    keywordAppearsUnnegated(normalized, normalizeText(keyword))
  );
}

function hasWarningKeyword(text: string, symptoms: string[]) {
  const normalized = normalizeText(`${text} . ${symptoms.join(" . ")}`);

  return WARNING_KEYWORDS.some((keyword) =>
    keywordAppearsUnnegated(normalized, normalizeText(keyword))
  );
}

export function getPriorityLabel(priority: Priority) {
  const labels: Record<Priority, string> = {
    ROJO: "Emergencia",
    NARANJA: "Muy urgente",
    AMARILLO: "Urgente",
    VERDE: "Poco urgente",
    AZUL: "No urgente",
  };

  return labels[priority];
}

export function getRecommendation(priority: Priority) {
  const recommendations: Record<Priority, string> = {
    ROJO:
      "Por lo que contás, esto puede requerir atención inmediata. Contactá a emergencias o dirigite a una guardia ahora. Si estás solo/a, pedí ayuda a alguien cercano.",
    NARANJA:
      "Recomendamos atención médica prioritaria. Dirigite a una guardia o centro de atención cuanto antes.",
    AMARILLO:
      "Recomendamos evaluación médica hoy. Evitá demorar la consulta si los síntomas aumentan o aparece una señal de alarma.",
    VERDE:
      "Podría resolverse con atención no prioritaria o consulta programada. Controlá evolución y volvé a evaluar si empeora.",
    AZUL:
      "Puede no requerir guardia en este momento. Seguí medidas de autocuidado y consultá si aparece dolor fuerte, fiebre, falta de aire, sangrado o empeoramiento.",
  };

  return recommendations[priority];
}

export function analyzeTriage(input: TriageInput): TriageResult {
  const symptoms = input.sintomas ?? [];
  const motivo = input.motivo.trim();
  const intensidad = input.intensidad ?? 0;
  const detectedRedSignals = detectRedSignals(motivo, symptoms);
  const redSignals = Array.from(
    new Set([...(input.redFlags ?? []), ...detectedRedSignals])
  );
  const urgentSignals = Array.from(new Set(input.urgentSignals ?? []));
  const source = normalizeSource(input.source);
  const caseCode = `FR-${Date.now()}`;
  const nombre = input.nombre?.trim();

  let priority: Priority = "VERDE";

  if (redSignals.length > 0) {
    priority = "ROJO";
  } else if (
    urgentSignals.length > 0 ||
    intensidad >= 7 ||
    hasWarningKeyword(motivo, symptoms)
  ) {
    priority = "AMARILLO";
  }

  return {
    id: caseCode,
    caseCode,
    patientLabel: nombre || "Paciente sin identificar",
    source,
    sourceLabel: getSourceLabel(source),
    priority,
    title: getPriorityLabel(priority),
    recommendation: getRecommendation(priority),
    redSignals,
    handover: {
      motivo,
      prioridad: priority,
      senalesDetectadas: redSignals,
      senalesUrgentes: urgentSignals,
      evolucion: input.evolucion,
      sintomasAdicionales: symptoms,
    },
    createdAt: new Date().toISOString(),
  };
}

export function priorityRank(priority: Priority) {
  const rank: Record<Priority, number> = {
    ROJO: 1,
    NARANJA: 2,
    AMARILLO: 3,
    VERDE: 4,
    AZUL: 5,
  };

  return rank[priority];
}
