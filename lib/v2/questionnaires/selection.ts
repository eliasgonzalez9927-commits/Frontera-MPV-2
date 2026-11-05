import type { MultipleQuestion } from "./types";

/**
 * Selección múltiple con opciones exclusivas (ej. "Nada de esto"):
 * elegir una exclusiva desmarca las demás, y elegir otra desmarca las exclusivas.
 */
export function toggleMultiple(
  question: MultipleQuestion,
  current: string[],
  optionId: string,
  checked: boolean
): string[] {
  const exclusive = question.exclusiveOptionIds ?? [];

  if (!checked) return current.filter((id) => id !== optionId);
  if (exclusive.includes(optionId)) return [optionId];
  return [...current.filter((id) => !exclusive.includes(id)), optionId];
}
