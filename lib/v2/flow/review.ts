import { demoScenarioLabels } from "../fixtures/demoComplaints";
import { questionnaireForState } from "../questionnaires";
import { getPath } from "../questionnaires/engine";
import { formatAnswer } from "../questionnaires/format";
import { documentTypeLabels, formatBirthDate, getAgeYears } from "../validation/identification";
import { contextLabels, relationshipLabels } from "./labels";
import { questionRoute, routes } from "./routes";
import type { FlowState } from "./state";

// Modelo de la pantalla de revisión (P07): qué se muestra y adónde lleva cada "Cambiar".

export type ReviewRow = {
  id: string;
  label: string;
  /** Texto a mostrar. null = sin respuesta (se muestra `emptyLabel`). */
  value: string | null;
  emptyLabel: string;
  /** Si la fila se edita por separado, adónde lleva. */
  editRoute?: string;
  editLabel?: string;
};

export type ReviewSection = {
  id: "who" | "complaint" | "answers" | "identification";
  title: string;
  /** Si toda la sección se edita en un mismo lugar, adónde lleva. */
  editRoute?: string;
  /** Aclaración bajo el título (ej. "Ejemplo de demostración"). */
  note?: string;
  rows: ReviewRow[];
};

export function buildReview(state: FlowState): ReviewSection[] {
  const questionnaire = questionnaireForState(state);
  const { identification: id } = state;

  const who: ReviewSection = {
    id: "who",
    title: "Para quién es la consulta",
    rows: [
      {
        id: "context",
        label: "Consulta",
        value: state.patientContext ? contextLabels[state.patientContext] : null,
        emptyLabel: "Sin responder",
        editRoute: routes.context,
        editLabel: "Cambiar para quién es la consulta",
      },
      ...(state.patientContext === "other"
        ? [
            {
              id: "relationship",
              label: "Vínculo",
              value: state.relationship ? relationshipLabels[state.relationship] : null,
              emptyLabel: "Sin responder",
              editRoute: routes.relation,
              editLabel: "Cambiar el vínculo con la persona",
            },
          ]
        : []),
    ],
  };

  const complaint: ReviewSection = {
    id: "complaint",
    title: "Motivo de consulta",
    editRoute: routes.complaint,
    note: state.demoScenario
      ? `Ejemplo de demostración: ${demoScenarioLabels[state.demoScenario]}`
      : undefined,
    rows: [
      {
        id: "complaint",
        label: "Lo que escribiste",
        value: state.complaint.trim() ? state.complaint : null,
        emptyLabel: "Sin respuesta",
      },
    ],
  };

  const answers: ReviewSection = {
    id: "answers",
    title: "Respuestas complementarias",
    rows: getPath(questionnaire, state.answers)
      .map((stepId) => questionnaire.steps[stepId])
      .filter((question) => question.type !== "info")
      .map((question) => {
        // Una confirmación se rotula con lo que se confirmó, no con su título genérico.
        const label = question.type === "confirm" ? question.confirmLabel : question.title;
        return {
          id: question.id,
          label,
          value: formatAnswer(question, state.answers[question.id]),
          emptyLabel: question.required ? "Sin responder" : "Omitida",
          editRoute: questionRoute(question.id),
          editLabel: `Cambiar la respuesta a "${label}"`,
        };
      }),
  };

  const document =
    id.documentType === ""
      ? null
      : id.documentType === "none"
        ? documentTypeLabels.none
        : `${documentTypeLabels[id.documentType]} ${id.documentNumber.trim()}`;

  const identification: ReviewSection = {
    id: "identification",
    title: state.patientContext === "other" ? "Datos de la persona" : "Tus datos",
    editRoute: routes.identification,
    rows: [
      {
        id: "name",
        label: "Nombre y apellido",
        value: [id.firstName.trim(), id.lastName.trim()].filter(Boolean).join(" ") || null,
        emptyLabel: "Sin completar",
      },
      { id: "document", label: "Documento", value: document, emptyLabel: "Sin completar" },
      { id: "birth", label: "Fecha de nacimiento", value: formatBirthDate(id), emptyLabel: "Sin completar" },
      { id: "contact", label: "Contacto", value: id.contact.trim() || null, emptyLabel: "No indicado" },
    ],
  };

  return [who, complaint, answers, identification];
}

/**
 * Avisos NO bloqueantes cuando la fecha de nacimiento no condice con lo elegido en P02.
 * Solo señalan una posible equivocación; no restringen ni deciden nada.
 */
export function getBirthDateNotice(state: FlowState, now: Date): string | null {
  const { birthDay, birthMonth, birthYear } = state.identification;
  const age = getAgeYears(birthDay, birthMonth, birthYear, now);
  if (age === null) return null;

  if (state.relationship === "minor" && age >= 18) {
    return "Indicaste un menor a cargo, pero la fecha corresponde a una persona adulta. Revisá si es correcta.";
  }
  if (state.relationship === "accompanied_adult" && age < 18) {
    return "Indicaste un adulto acompañado, pero la fecha corresponde a una persona menor de edad. Revisá si es correcta.";
  }
  return null;
}
