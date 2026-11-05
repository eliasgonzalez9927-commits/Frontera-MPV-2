// Guion de la conversación: lo que dice Frontera y cómo se muestra lo que respondió la persona.
// Es texto fijo y de demostración: no hay IA ni interpretación de lo que se escribe.

import { contextLabels, relationshipLabels } from "../flow/labels";
import type { FlowState } from "../flow/state";
import { questionnaireForState } from "../questionnaires";
import { formatAnswer } from "../questionnaires/format";
import { documentTypeLabels, formatBirthDate } from "../validation/identification";
import type { ChatTurn } from "./turns";

export type BotMessage = { text: string; detail?: string };

export function getBotMessage(turn: ChatTurn, state: FlowState): BotMessage {
  const other = state.patientContext === "other";

  switch (turn.kind) {
    case "context":
      return { text: "¿La consulta es para vos o para otra persona?" };
    case "relationship":
      return { text: "¿Quién es la persona para la que respondés?" };
    case "ack":
      return {
        text: "Antes de seguir, tres cosas importantes:",
        detail:
          "No reemplazo una evaluación médica: no doy diagnósticos ni indico tratamientos. Si te sentís peor mientras esperás, avisá al personal enseguida. Y en esta demostración no se guarda ni se envía nada.",
      };
    case "complaint":
      return {
        text: other ? "¿Qué le está pasando?" : "¿Qué te está pasando?",
        detail: "Contame con tus palabras. No hace falta usar términos médicos.",
      };
    case "question": {
      const question = questionnaireForState(state).steps[turn.stepId ?? ""];
      if (!question) return { text: "" };
      return {
        text: question.title,
        detail: question.type === "info" ? question.body : question.description,
      };
    }
    case "id_name":
      return {
        text: other
          ? "Ahora los datos para identificarla. ¿Cuál es su nombre y apellido?"
          : "Ahora tus datos para identificarte. ¿Cuál es tu nombre y apellido?",
        detail: "Tal como figuran en el documento.",
      };
    case "id_document":
      return { text: other ? "¿Con qué documento se identifica?" : "¿Con qué documento te identificás?" };
    case "id_birth":
      return { text: other ? "¿Cuál es su fecha de nacimiento?" : "¿Cuál es tu fecha de nacimiento?" };
    case "id_contact":
      return {
        text: "¿Querés dejar un email o un teléfono por si necesitan avisarte?",
        detail: "Es opcional.",
      };
  }
}

/** Texto que se muestra como respuesta de la persona una vez que el turno está hecho. */
export function getAnswerText(turn: ChatTurn, state: FlowState): string {
  const id = state.identification;

  switch (turn.kind) {
    case "context":
      return state.patientContext ? contextLabels[state.patientContext] : "";
    case "relationship":
      return state.relationship ? relationshipLabels[state.relationship] : "";
    case "ack":
      return "Entendido";
    case "complaint":
      return state.complaint;
    case "question": {
      const question = questionnaireForState(state).steps[turn.stepId ?? ""];
      if (!question) return "";
      if (question.type === "info") return "Entendido";
      return formatAnswer(question, state.answers[question.id]) ?? "Omitida";
    }
    case "id_name":
      return `${id.firstName.trim()} ${id.lastName.trim()}`.trim();
    case "id_document": {
      if (id.documentType === "") return "";
      const label = documentTypeLabels[id.documentType];
      return id.documentType === "none" ? label : `${label} ${id.documentNumber.trim()}`;
    }
    case "id_birth":
      return formatBirthDate(id) ?? "";
    case "id_contact":
      return id.contact.trim() || "Sin contacto";
  }
}
