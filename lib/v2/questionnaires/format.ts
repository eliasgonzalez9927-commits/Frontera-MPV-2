import type { AnswerValue, Question } from "./types";

/** Texto legible de una respuesta (para revisión). null si no hay nada para mostrar. */
export function formatAnswer(question: Question, value: AnswerValue | undefined): string | null {
  if (question.type === "info" || value === undefined) return null;

  switch (question.type) {
    case "single":
      return question.options.find((o) => o.id === value)?.label ?? null;
    case "multiple": {
      const labels = (Array.isArray(value) ? value : [])
        .map((id) => question.options.find((o) => o.id === id)?.label)
        .filter((label): label is string => Boolean(label));
      return labels.length > 0 ? labels.join(", ") : null;
    }
    case "text":
      return typeof value === "string" && value.trim() ? value : null;
    case "scale":
      return typeof value === "number" ? `${value} de ${question.max}` : null;
    case "confirm":
      return value === true ? "Confirmado" : null;
  }
}
