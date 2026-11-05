// Modelo de la versión conversacional. La conversación NO guarda su propio progreso: se deriva
// del mismo estado del recorrido por pantallas (FlowState). Cada "turno" es una pregunta de
// Frontera; está "hecho" cuando ya hay una respuesta válida (o una omisión consciente).

import type { FlowState } from "../flow/state";
import { questionnaireForState } from "../questionnaires";
import { getPath } from "../questionnaires/engine";
import { isEmptyAnswer, validateAnswer } from "../questionnaires/validation";
import { validateComplaint } from "../validation/complaint";
import { validateBirthDate, validateContact, validateDocument, validateName } from "../validation/identification";

export type TurnKind =
  | "context"
  | "relationship"
  | "ack"
  | "complaint"
  | "question"
  | "id_name"
  | "id_document"
  | "id_birth"
  | "id_contact";

export type ChatTurn = {
  /** Identificador estable del turno. */
  key: string;
  kind: TurnKind;
  /** Solo para kind "question": id de la pregunta del cuestionario. */
  stepId?: string;
  done: boolean;
};

/** Clave en `seen` para recordar que el contacto (opcional) ya se preguntó. */
export const CONTACT_SEEN_KEY = "id_contact";

export function getChatTurns(state: FlowState, now: Date): ChatTurn[] {
  const turns: ChatTurn[] = [];
  const id = state.identification;

  turns.push({ key: "context", kind: "context", done: state.patientContext !== null });

  if (state.patientContext === "other") {
    turns.push({ key: "relationship", kind: "relationship", done: state.relationship !== null });
  }

  turns.push({ key: "ack", kind: "ack", done: state.readAcknowledged });
  turns.push({ key: "complaint", kind: "complaint", done: validateComplaint(state.complaint) === null });

  const questionnaire = questionnaireForState(state);
  for (const stepId of getPath(questionnaire, state.answers)) {
    const question = questionnaire.steps[stepId];
    const value = state.answers[stepId];
    const valid = validateAnswer(question, value) === null;
    // Una pregunta se considera hecha si tiene respuesta válida, o si ya se pasó por ella
    // (omitida o informativa).
    const passed = Boolean(state.seen[stepId]) || (question.type !== "info" && !isEmptyAnswer(value));
    turns.push({ key: `q:${stepId}`, kind: "question", stepId, done: valid && passed });
  }

  turns.push({
    key: "id_name",
    kind: "id_name",
    done: validateName(id.firstName, "nombre") === null && validateName(id.lastName, "apellido") === null,
  });
  turns.push({
    key: "id_document",
    kind: "id_document",
    done: id.documentType !== "" && validateDocument(id.documentType, id.documentNumber) === null,
  });
  turns.push({
    key: "id_birth",
    kind: "id_birth",
    done: validateBirthDate(id.birthDay, id.birthMonth, id.birthYear, now) === null,
  });
  turns.push({
    key: "id_contact",
    kind: "id_contact",
    done: validateContact(id.contact) === null && Boolean(state.seen[CONTACT_SEEN_KEY]),
  });

  return turns;
}

/** Índice del primer turno pendiente, o -1 si la conversación ya está completa. */
export function getActiveIndex(turns: ChatTurn[]) {
  return turns.findIndex((turn) => !turn.done);
}

/**
 * Turnos que se muestran: hasta el pendiente (inclusive), o hasta el que se está corrigiendo.
 * Los turnos posteriores a uno que se corrige se ocultan hasta terminar la corrección.
 */
export function getVisibleTurns(turns: ChatTurn[], editingKey: string | null): ChatTurn[] {
  const editingIndex = editingKey ? turns.findIndex((turn) => turn.key === editingKey) : -1;
  if (editingIndex >= 0) return turns.slice(0, editingIndex + 1);

  const active = getActiveIndex(turns);
  return active === -1 ? turns : turns.slice(0, active + 1);
}
