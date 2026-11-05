import type { DemoScenarioId } from "../flow/state";

// Cuestionarios de demostración: definiciones declarativas y serializables.
// Sirven para probar interacciones; NO son algoritmos clínicos ni cuestionarios validados.

export const END = "__end__" as const;
export type StepId = string;
export type Target = StepId | typeof END;

export type AnswerValue = string | string[] | number | boolean;

export type Option = { id: string; label: string; description?: string };

/** Condición sobre una respuesta ya dada (de la pregunta actual o de una anterior). */
export type Condition = {
  question: StepId;
  /** Respuesta única o escala igual a este valor. */
  equals?: string | number | boolean;
  /** Selección múltiple que incluye esta opción. */
  includes?: string;
};

/** Transición: la primera rama cuya condición se cumple; si ninguna, `default`. */
export type Transition = {
  branches?: Array<{ when: Condition; to: Target }>;
  default: Target;
};

type Base = {
  id: StepId;
  title: string;
  description?: string;
  required: boolean;
  next: Transition;
};

export type SingleQuestion = Base & { type: "single"; options: Option[] };

export type MultipleQuestion = Base & {
  type: "multiple";
  options: Option[];
  /** Opciones que no se combinan con otras (ej. "Nada de esto"). */
  exclusiveOptionIds?: string[];
  validation?: { minSelected?: number; maxSelected?: number };
};

export type TextQuestion = Base & {
  type: "text";
  placeholder?: string;
  validation?: { minLength?: number; maxLength?: number };
};

export type ScaleQuestion = Base & {
  type: "scale";
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
};

export type ConfirmQuestion = Base & { type: "confirm"; confirmLabel: string };

/** Información contextual: no se responde, solo se lee y se continúa. */
export type InfoQuestion = Base & { type: "info"; body?: string };

export type Question =
  | SingleQuestion
  | MultipleQuestion
  | TextQuestion
  | ScaleQuestion
  | ConfirmQuestion
  | InfoQuestion;

export type Questionnaire = {
  id: DemoScenarioId;
  name: string;
  start: StepId;
  steps: Record<StepId, Question>;
};

export type Answers = Record<StepId, AnswerValue>;
