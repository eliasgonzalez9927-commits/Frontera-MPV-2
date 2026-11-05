import type { AnswerValue, Question } from "./types";

// Validación de interfaz únicamente: comprueba que haya respuesta y que respete límites de forma.
// No interpreta el contenido.

export function isEmptyAnswer(value: AnswerValue | undefined) {
  if (value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** null = válida. Una pregunta opcional sin respuesta es válida. */
export function validateAnswer(question: Question, value: AnswerValue | undefined): string | null {
  switch (question.type) {
    case "info":
      return null;

    case "confirm":
      if (question.required && value !== true) return "Confirmá para poder continuar.";
      return null;

    case "single": {
      if (isEmptyAnswer(value)) return question.required ? "Elegí una opción para continuar." : null;
      return question.options.some((o) => o.id === value) ? null : "Elegí una de las opciones.";
    }

    case "multiple": {
      const selected = Array.isArray(value) ? value : [];
      if (selected.length === 0) return question.required ? "Elegí al menos una opción para continuar." : null;
      const { minSelected, maxSelected } = question.validation ?? {};
      if (minSelected && selected.length < minSelected) return `Elegí al menos ${minSelected} opciones.`;
      if (maxSelected && selected.length > maxSelected) return `Elegí hasta ${maxSelected} opciones.`;
      const known = new Set(question.options.map((o) => o.id));
      return selected.every((id) => known.has(id)) ? null : "Elegí solo entre las opciones.";
    }

    case "text": {
      const text = typeof value === "string" ? value : "";
      if (text.trim().length === 0) return question.required ? "Contanos con tus palabras para poder continuar." : null;
      const { minLength, maxLength } = question.validation ?? {};
      if (minLength && text.trim().length < minLength) return `Escribí al menos ${minLength} caracteres.`;
      if (maxLength && text.length > maxLength) return `Usá hasta ${maxLength} caracteres.`;
      return null;
    }

    case "scale": {
      if (typeof value !== "number") return question.required ? "Elegí un número para continuar." : null;
      if (!Number.isInteger(value) || value < question.min || value > question.max) {
        return `Elegí un número entre ${question.min} y ${question.max}.`;
      }
      return null;
    }
  }
}
