import { questionnaireForState } from "../questionnaires";
import {
  getFirstInvalidStep,
  getFirstPendingStep,
  getPath,
  getPreviousStep,
  getStepGuard,
  resolveNext,
} from "../questionnaires/engine";
import { END } from "../questionnaires/types";
import { validateComplaint } from "../validation/complaint";
import { isIdentificationValid } from "../validation/identification";
import type { FlowState } from "./state";

export const routes = {
  welcome: "/v2",
  context: "/v2/contexto",
  relation: "/v2/contexto/relacion",
  info: "/v2/informacion",
  complaint: "/v2/motivo",
  /** Índice de P05: redirige a la primera pregunta del recorrido. */
  questions: "/v2/preguntas",
  identification: "/v2/datos",
  review: "/v2/revision",
  pass: "/v2/pase",
} as const;

export type FlowRoute = (typeof routes)[keyof typeof routes];

export const questionRoute = (stepId: string) => `${routes.questions}/${stepId}`;

const isContextComplete = (s: FlowState) =>
  s.patientContext === "self" || (s.patientContext === "other" && s.relationship !== null);

/**
 * "Ahora" para validar fechas. Se resuelve fuera del render (en eventos) y se pasa explícito
 * a las funciones puras, que así quedan deterministas y testeables.
 */
type Now = Date;

/** Primer requisito previo a P05 que falta (contexto → lectura → motivo), o null. */
function getPrerequisiteRedirect(state: FlowState): FlowRoute | null {
  if (!isContextComplete(state)) return routes.context;
  if (!state.readAcknowledged) return routes.info;
  if (validateComplaint(state.complaint) !== null) return routes.complaint;
  return null;
}

function findResumeRoute(state: FlowState, now: Now, includeUnseen: boolean): string | null {
  if (state.patientContext === null) return routes.context;
  if (state.patientContext === "other" && state.relationship === null) return routes.relation;
  if (!state.readAcknowledged) return routes.info;
  if (validateComplaint(state.complaint) !== null) return routes.complaint;

  const questionnaire = questionnaireForState(state);
  const step = includeUnseen
    ? getFirstPendingStep(questionnaire, state.answers, state.seen)
    : getFirstInvalidStep(questionnaire, state.answers);
  if (step) return questionRoute(step);

  if (!isIdentificationValid(state.identification, now)) return routes.identification;
  return null;
}

/**
 * Primera pantalla con algo OBLIGATORIO pendiente, en el orden del recorrido.
 * null = el recorrido está completo y se puede revisar (es la guarda de P07 y P08).
 */
export function getResumeRoute(state: FlowState, now: Now): string | null {
  return findResumeRoute(state, now, false);
}

/**
 * Igual que getResumeRoute, pero al editar también incluye las preguntas que la persona todavía
 * no vio: si un cambio abre preguntas nuevas (aunque sean opcionales), se le muestran.
 */
export function getEditContinueRoute(state: FlowState, now: Now): string | null {
  return findResumeRoute(state, now, true);
}

/** Siguiente pantalla de las que no son preguntas (transición explícita y determinista). */
export function getNextRoute(state: FlowState, current: FlowRoute): string {
  switch (current) {
    case routes.welcome:
      return routes.context;
    case routes.context:
      return state.patientContext === "other" ? routes.relation : routes.info;
    case routes.relation:
      return routes.info;
    case routes.info:
      return routes.complaint;
    case routes.complaint:
      return questionRoute(questionnaireForState(state).start);
    case routes.identification:
      return routes.review;
    case routes.review:
      return routes.pass;
    default:
      return current;
  }
}

/** Pantalla siguiente a una pregunta: la próxima del recorrido, o P06 al terminar. */
export function getNextAfterQuestion(state: FlowState, stepId: string): string {
  const q = questionnaireForState(state);
  const next = resolveNext(q, stepId, state.answers);
  return next === END ? routes.identification : questionRoute(next);
}

/** Pantalla anterior. null si no hay (primera pantalla). */
export function getPreviousRoute(state: FlowState, current: FlowRoute): string | null {
  switch (current) {
    case routes.context:
      return routes.welcome;
    case routes.relation:
      return routes.context;
    case routes.info:
      return state.patientContext === "other" ? routes.relation : routes.context;
    case routes.complaint:
      return routes.info;
    case routes.identification:
      return questionRoute(getLastStep(state) ?? questionnaireForState(state).start);
    case routes.review:
      return routes.identification;
    case routes.pass:
      return routes.review;
    default:
      return null;
  }
}

/** Última pregunta del camino actual (a la que vuelve P06). */
export function getLastStep(state: FlowState): string | null {
  const path = getPath(questionnaireForState(state), state.answers);
  return path[path.length - 1] ?? null;
}

/** Pantalla anterior a una pregunta: la previa del camino, o el motivo si es la primera. */
export function getPreviousBeforeQuestion(state: FlowState, stepId: string): string {
  const q = questionnaireForState(state);
  const previous = getPreviousStep(q, state.answers, stepId);
  return previous ? questionRoute(previous) : routes.complaint;
}

/**
 * Destino al "continuar" una pantalla. Normalmente es el siguiente del recorrido; si se está
 * editando desde la revisión, es lo que haya quedado pendiente o, si no hay nada, la revisión.
 */
export function resolveContinue(state: FlowState, defaultNext: string, now: Now): string {
  if (!state.editFromReview) return defaultNext;
  return getEditContinueRoute(state, now) ?? routes.review;
}

/**
 * Destino al "volver". Editando desde la revisión y con todo completo, vuelve a la revisión;
 * si quedó algo pendiente (p. ej. cambió el vínculo), retrocede normalmente.
 */
export function resolveBack(state: FlowState, defaultPrevious: string | null, now: Now): string | null {
  if (state.editFromReview && getResumeRoute(state, now) === null) return routes.review;
  return defaultPrevious;
}

/**
 * Evita estados imposibles: si se entra por URL a una pantalla sin haber completado las
 * anteriores, devuelve la pantalla a la que corresponde volver. null = acceso permitido.
 */
export function getGuardRedirect(state: FlowState, target: FlowRoute, now: Now): string | null {
  switch (target) {
    case routes.relation:
      return state.patientContext === "other" ? null : routes.context;
    case routes.info:
      return isContextComplete(state) ? null : routes.context;
    case routes.complaint:
      if (!isContextComplete(state)) return routes.context;
      return state.readAcknowledged ? null : routes.info;
    case routes.questions: {
      const missing = getPrerequisiteRedirect(state);
      return missing ?? questionRoute(questionnaireForState(state).start);
    }
    case routes.identification: {
      const missing = getPrerequisiteRedirect(state);
      if (missing) return missing;
      const invalid = getFirstInvalidStep(questionnaireForState(state), state.answers);
      return invalid ? questionRoute(invalid) : null;
    }
    case routes.review:
      return getResumeRoute(state, now);
    case routes.pass:
      return getResumeRoute(state, now) ?? (state.submission.status === "submitted" ? null : routes.review);
    default:
      return null;
  }
}

/** Guarda de una pregunta concreta (/v2/preguntas/[id]). null = acceso permitido. */
export function getQuestionGuardRedirect(state: FlowState, stepId: string): string | null {
  const missing = getPrerequisiteRedirect(state);
  if (missing) return missing;
  const target = getStepGuard(questionnaireForState(state), state.answers, stepId);
  return target ? questionRoute(target) : null;
}
