import type { Priority } from "@/lib/triage";

export type PatientContext = "self" | "other";
export type EntryMode = "clinic_qr" | "onsite_unknown" | "needs_orientation";
export type RedFlagAnswerValue = "yes" | "no" | "unsure";

export type RedFlagAnswer = {
  id: string;
  question: string;
  answer: RedFlagAnswerValue;
  signal: string;
};

export const entryModeLabels: Record<EntryMode, string> = {
  clinic_qr: "Entrada QR de guardia",
  onsite_unknown: "Entrada web / guardia sin clínica asociada",
  needs_orientation: "Orientación general / No sé a dónde ir",
};

export function normalizeEntryMode(
  value: unknown,
  hasClinic: boolean
): EntryMode {
  if (hasClinic) {
    return "clinic_qr";
  }

  if (value === "needs_orientation" || value === "onsite_unknown") {
    return value;
  }

  return "onsite_unknown";
}

export function getEntryModeLabel(value?: string) {
  if (
    value === "clinic_qr" ||
    value === "onsite_unknown" ||
    value === "needs_orientation"
  ) {
    return entryModeLabels[value];
  }

  return undefined;
}

export function getOrientationMessage(priority: Priority) {
  if (priority === "ROJO") {
    return "Esto puede requerir atención inmediata. Contactá emergencias o dirigite a una guardia ahora. Frontera no envió una ambulancia.";
  }

  if (priority === "AMARILLO" || priority === "NARANJA") {
    return "Por lo que contás, conviene que te evalúe un equipo médico hoy. En la próxima versión vamos a orientarte hacia una guardia compatible cercana.";
  }

  return "Podría resolverse con atención no prioritaria o consulta programada. Controlá evolución y volvé a evaluar si empeora.";
}

export const evolutionOptions = [
  "Menos de 1 hora",
  "1 a 6 horas",
  "Hoy",
  "Hace varios días",
  "No estoy seguro",
];

export const redFlagQuestions = [
  {
    id: "chest_pain",
    question: "¿Tenés dolor de pecho fuerte?",
    signal: "dolor de pecho",
  },
  {
    id: "breathing",
    question: "¿Te cuesta respirar?",
    signal: "me cuesta respirar",
  },
  {
    id: "fainting",
    question: "¿Sentís que te podés desmayar o perdiste el conocimiento?",
    signal: "pérdida de conocimiento",
  },
  {
    id: "bleeding",
    question: "¿Tenés sangrado abundante?",
    signal: "sangrado abundante",
  },
  {
    id: "seizures",
    question: "¿Tuviste convulsiones?",
    signal: "convulsión",
  },
  {
    id: "stroke",
    question:
      "¿Sentís debilidad repentina en un lado del cuerpo o dificultad para hablar?",
    signal: "debilidad en un lado",
  },
];

const obviousInvalidInputs = new Set([
  "asdasd",
  "asdasdasd",
  "asdf",
  "test",
  "testing",
  "prueba",
  "...",
  "....",
  "xxxxx",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function isUsefulChiefComplaint(value: string) {
  const normalized = normalizeText(value);
  const lettersAndNumbers = normalized.replace(/[^a-z0-9ñ]/g, "");
  const uniqueCharacters = new Set(lettersAndNumbers).size;
  const words = normalized.split(/\s+/).filter(Boolean);
  const hasRepeatedPattern = /^(.{1,4})\1{2,}$/.test(lettersAndNumbers);

  if (lettersAndNumbers.length < 10) {
    return false;
  }

  if (obviousInvalidInputs.has(normalized) || obviousInvalidInputs.has(lettersAndNumbers)) {
    return false;
  }

  if (uniqueCharacters < 4 || hasRepeatedPattern) {
    return false;
  }

  return words.length >= 2 || lettersAndNumbers.length >= 18;
}

export function getPositiveRedFlags(answers: RedFlagAnswer[]) {
  return answers
    .filter((answer) => answer.answer === "yes")
    .map((answer) => answer.signal);
}

export function getEstimatedPriority(
  intensity: number,
  answers: RedFlagAnswer[]
): Priority {
  if (getPositiveRedFlags(answers).length > 0) {
    return "ROJO";
  }

  if (intensity >= 9) {
    return "NARANJA";
  }

  if (intensity >= 7) {
    return "AMARILLO";
  }

  return "VERDE";
}

export function getEstimatedPriorityReason(
  priority: Priority,
  intensity: number
) {
  if (priority === "ROJO") {
    return "Se informó al menos una señal roja.";
  }

  if (priority === "NARANJA") {
    return "La intensidad informada es muy alta, sin señales rojas confirmadas.";
  }

  if (intensity >= 7) {
    return "La intensidad informada es alta, sin señales rojas confirmadas.";
  }

  return "No se informaron señales rojas y la intensidad es leve o moderada.";
}
