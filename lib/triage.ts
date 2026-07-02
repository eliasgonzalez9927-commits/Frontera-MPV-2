export type Priority = "ROJO" | "NARANJA" | "AMARILLO" | "VERDE" | "AZUL";
export type TriageSource = "web" | "qr" | "whatsapp";

export type TriageInput = {
  motivo: string;
  intensidad?: number;
  evolucion?: string;
  sintomas?: string[];
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
    evolucion?: string;
    sintomasAdicionales: string[];
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

function detectRedSignals(text: string, symptoms: string[]) {
  const normalized = normalizeText(`${text} ${symptoms.join(" ")}`);

  return RED_SIGNAL_KEYWORDS.filter((keyword) =>
    normalized.includes(normalizeText(keyword))
  );
}

function hasWarningKeyword(text: string, symptoms: string[]) {
  const normalized = normalizeText(`${text} ${symptoms.join(" ")}`);

  return WARNING_KEYWORDS.some((keyword) =>
    normalized.includes(normalizeText(keyword))
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
  const redSignals = detectRedSignals(motivo, symptoms);
  const source = normalizeSource(input.source);
  const caseCode = `FR-${Date.now()}`;

  let priority: Priority = "VERDE";

  if (redSignals.length > 0) {
    priority = "ROJO";
  } else if (intensidad >= 9) {
    priority = "NARANJA";
  } else if (intensidad >= 7 || hasWarningKeyword(motivo, symptoms)) {
    priority = "AMARILLO";
  } else if (intensidad <= 3 && motivo.length > 0) {
    priority = "AZUL";
  }

  return {
    id: caseCode,
    caseCode,
    patientLabel: "Paciente sin identificar",
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
