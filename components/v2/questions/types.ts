import type { AnswerValue, Question } from "@/lib/v2/questionnaires/types";

// Contrato común de las vistas de pregunta: reciben la definición, el valor actual y el error;
// no conocen el recorrido ni la navegación.
export type QuestionViewProps<T extends Question = Question> = {
  question: T;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue | null) => void;
};
