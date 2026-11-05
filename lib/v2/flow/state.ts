// Estado del recorrido del paciente (solo en memoria; nada se guarda ni se envía).
// Reglas de consistencia: no puede haber un "vínculo" si la consulta es para uno mismo, y un
// envío simulado deja de valer apenas cambia cualquier dato.

import type { AnswerValue } from "../questionnaires/types";
import { emptyIdentification, type Identification } from "../validation/identification";

export type PatientContext = "self" | "other";
export type Relationship = "minor" | "accompanied_adult" | "cannot_respond";
export type DemoScenarioId = "musculoskeletal" | "abdominal" | "unidentified";

export type Submission = { status: "idle" | "submitted"; episodeCode: string | null };

export type FlowState = {
  institution: { id: string; name: string; simulatedSelection: boolean };
  patientContext: PatientContext | null;
  relationship: Relationship | null;
  /** Confirmación de lectura de P03. No es un consentimiento legal. */
  readAcknowledged: boolean;
  /** Texto del motivo de consulta, tal como lo escribió la persona (sin reescritura). */
  complaint: string;
  /** Si el texto vino de un ejemplo de demostración, cuál (define el recorrido de P05). */
  demoScenario: DemoScenarioId | null;
  /** Respuestas de P05 por id de pregunta. Solo en memoria. */
  answers: Record<string, AnswerValue>;
  /** Preguntas de P05 por las que la persona ya pasó (respondidas u omitidas). */
  seen: Record<string, true>;
  /** Datos de identificación de P06 (ficticios). */
  identification: Identification;
  /** true mientras se corrige algo desde la revisión: al terminar se vuelve a P07. */
  editFromReview: boolean;
  /** Resultado del envío SIMULADO. Nunca se transmite nada. */
  submission: Submission;
};

/** Recorrido efectivo de P05: el del ejemplo elegido, o el genérico "no identificado". */
export function effectiveScenario(state: Pick<FlowState, "demoScenario">): DemoScenarioId {
  return state.demoScenario ?? "unidentified";
}

const idleSubmission: Submission = { status: "idle", episodeCode: null };

export const initialFlowState: FlowState = {
  institution: { id: "demo-hospital", name: "Hospital Demo Frontera", simulatedSelection: true },
  patientContext: null,
  relationship: null,
  readAcknowledged: false,
  complaint: "",
  demoScenario: null,
  answers: {},
  seen: {},
  identification: emptyIdentification,
  editFromReview: false,
  submission: idleSubmission,
};

export type FlowAction =
  | { type: "setContext"; value: PatientContext }
  | { type: "setRelationship"; value: Relationship }
  | { type: "setAcknowledged"; value: boolean }
  | { type: "setComplaint"; value: string }
  | { type: "loadDemoComplaint"; scenario: DemoScenarioId; text: string }
  | { type: "clearComplaint" }
  /** value null = quitar la respuesta. */
  | { type: "setAnswer"; id: string; value: AnswerValue | null }
  /** `removed`: respuestas descartadas por un cambio de rama; se olvidan también como "vistas". */
  | { type: "replaceAnswers"; answers: Record<string, AnswerValue>; removed?: string[] }
  | { type: "markSeen"; id: string }
  | { type: "setIdentification"; patch: Partial<Identification> }
  | { type: "startEdit" }
  | { type: "finishEdit" }
  | { type: "submit"; episodeCode: string }
  | { type: "reset" };

// Acciones que no modifican datos del paciente: no invalidan un envío simulado.
const NON_DATA_ACTIONS = new Set<FlowAction["type"]>(["startEdit", "finishEdit", "submit", "reset", "markSeen"]);

function applyAction(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "setContext":
      return {
        ...state,
        patientContext: action.value,
        relationship: action.value === "self" ? null : state.relationship,
      };
    case "setRelationship":
      // Un vínculo solo existe si la consulta es para otra persona.
      return state.patientContext === "other" ? { ...state, relationship: action.value } : state;
    case "setAcknowledged":
      return { ...state, readAcknowledged: action.value };
    case "setComplaint":
      return { ...state, complaint: action.value };
    case "loadDemoComplaint": {
      const next = { ...state, complaint: action.text, demoScenario: action.scenario };
      // Si cambia el recorrido, las respuestas del anterior no aplican.
      return effectiveScenario(next) === effectiveScenario(state) ? next : { ...next, answers: {}, seen: {} };
    }
    case "clearComplaint": {
      const next = { ...state, complaint: "", demoScenario: null };
      return effectiveScenario(next) === effectiveScenario(state) ? next : { ...next, answers: {}, seen: {} };
    }
    case "setAnswer": {
      const answers = { ...state.answers };
      if (action.value === null) delete answers[action.id];
      else answers[action.id] = action.value;
      return { ...state, answers };
    }
    case "replaceAnswers": {
      const seen = { ...state.seen };
      for (const id of action.removed ?? []) delete seen[id];
      return { ...state, answers: action.answers, seen };
    }
    case "markSeen":
      return state.seen[action.id] ? state : { ...state, seen: { ...state.seen, [action.id]: true } };
    case "setIdentification": {
      const identification = { ...state.identification, ...action.patch };
      // Sin documento, el número no se conserva (evita datos sobrantes en la revisión).
      if (identification.documentType === "none") identification.documentNumber = "";
      return { ...state, identification };
    }
    case "startEdit":
      return state.editFromReview ? state : { ...state, editFromReview: true };
    case "finishEdit":
      return state.editFromReview ? { ...state, editFromReview: false } : state;
    case "submit":
      return { ...state, submission: { status: "submitted", episodeCode: action.episodeCode } };
    case "reset":
      return initialFlowState;
  }
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  const next = applyAction(state, action);
  if (next === state || NON_DATA_ACTIONS.has(action.type)) return next;
  return next.submission.status === "submitted" ? { ...next, submission: idleSubmission } : next;
}

/** ¿Hay algo cargado que se perdería al cerrar la pestaña? */
export function hasProgress(state: FlowState) {
  return (
    state.patientContext !== null ||
    state.readAcknowledged ||
    state.complaint.length > 0 ||
    Object.keys(state.answers).length > 0 ||
    Object.keys(state.seen).length > 0 ||
    Object.values(state.identification).some((value) => value !== "")
  );
}
