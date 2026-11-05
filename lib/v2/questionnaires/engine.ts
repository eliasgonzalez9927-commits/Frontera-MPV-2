import { END, type Answers, type Condition, type Questionnaire, type StepId, type Target } from "./types";
import { validateAnswer } from "./validation";

// Motor de navegación puro y determinista: sin estado propio, sin inferencia clínica.

function conditionHolds(condition: Condition, answers: Answers) {
  const value = answers[condition.question];
  if (value === undefined) return false;
  if (condition.includes !== undefined) return Array.isArray(value) && value.includes(condition.includes);
  if (condition.equals !== undefined) return value === condition.equals;
  return false;
}

/** Próximo paso a partir de la respuesta actual (primera rama que se cumple, o el default). */
export function resolveNext(q: Questionnaire, stepId: StepId, answers: Answers): Target {
  const { next } = q.steps[stepId];
  const hit = next.branches?.find((branch) => conditionHolds(branch.when, answers));
  return hit ? hit.to : next.default;
}

/** Camino proyectado desde el inicio con las respuestas actuales. */
export function getPath(q: Questionnaire, answers: Answers): StepId[] {
  const path: StepId[] = [];
  const seen = new Set<StepId>();
  let current: Target = q.start;

  while (current !== END && q.steps[current] && !seen.has(current)) {
    path.push(current);
    seen.add(current);
    current = resolveNext(q, current, answers);
  }
  return path;
}

export function getPreviousStep(q: Questionnaire, answers: Answers, stepId: StepId): StepId | null {
  const path = getPath(q, answers);
  const index = path.indexOf(stepId);
  return index > 0 ? path[index - 1] : null;
}

/** Primer paso del camino con una respuesta obligatoria faltante o inválida. */
export function getFirstInvalidStep(q: Questionnaire, answers: Answers): StepId | null {
  return getPath(q, answers).find((id) => validateAnswer(q.steps[id], answers[id]) !== null) ?? null;
}

/**
 * Primer paso del camino que requiere atención al EDITAR: uno con una respuesta obligatoria
 * faltante, o uno que la persona todavía no vio (aunque sea opcional o informativo). Así, al
 * cambiar a un recorrido nuevo se muestran todas sus preguntas, sin repetir las ya omitidas.
 */
export function getFirstPendingStep(
  q: Questionnaire,
  answers: Answers,
  seen: Readonly<Record<StepId, true>>
): StepId | null {
  return getPath(q, answers).find((id) => validateAnswer(q.steps[id], answers[id]) !== null || !seen[id]) ?? null;
}

export function isQuestionnaireComplete(q: Questionnaire, answers: Answers) {
  return getFirstInvalidStep(q, answers) === null;
}

/**
 * Evita estados imposibles al entrar por URL: a una pregunta solo se llega habiendo completado las
 * obligatorias anteriores. Devuelve el paso al que corresponde volver, o null si el acceso es válido.
 */
export function getStepGuard(q: Questionnaire, answers: Answers, stepId: StepId): StepId | null {
  if (!q.steps[stepId]) return q.start;

  const path = getPath(q, answers);
  for (const id of path) {
    if (id === stepId) return null;
    if (validateAnswer(q.steps[id], answers[id]) !== null) return id;
  }
  // El paso ya no pertenece al camino (cambió una rama).
  return getFirstInvalidStep(q, answers) ?? path[path.length - 1] ?? q.start;
}

/**
 * Cuando una respuesta cambia el recorrido, las respuestas de pasos que dejaron de pertenecer al
 * camino se descartan. `removed` permite avisar a la persona antes de hacerlo.
 */
export function pruneOrphanAnswers(
  q: Questionnaire,
  answers: Answers
): { answers: Answers; removed: StepId[] } {
  const onPath = new Set(getPath(q, answers));
  const kept: Answers = {};
  const removed: StepId[] = [];

  for (const [id, value] of Object.entries(answers)) {
    if (onPath.has(id)) kept[id] = value;
    else removed.push(id);
  }
  return { answers: kept, removed };
}

/** Comprueba la consistencia de una definición (se usa en tests). Devuelve los problemas hallados. */
export function validateQuestionnaire(q: Questionnaire): string[] {
  const problems: string[] = [];
  const ids = Object.keys(q.steps);

  if (!q.steps[q.start]) problems.push(`start "${q.start}" no existe`);

  for (const [key, question] of Object.entries(q.steps)) {
    if (question.id !== key) problems.push(`"${key}" tiene id "${question.id}"`);

    const targets = [question.next.default, ...(question.next.branches ?? []).map((b) => b.to)];
    for (const target of targets) {
      if (target !== END && !q.steps[target]) problems.push(`"${key}" apunta a "${target}", que no existe`);
    }
    for (const branch of question.next.branches ?? []) {
      if (!q.steps[branch.when.question]) problems.push(`"${key}" usa una condición sobre "${branch.when.question}", que no existe`);
    }

    if (question.type === "single" || question.type === "multiple") {
      const optionIds = question.options.map((o) => o.id);
      if (optionIds.length < 2) problems.push(`"${key}" necesita al menos 2 opciones`);
      if (new Set(optionIds).size !== optionIds.length) problems.push(`"${key}" tiene opciones repetidas`);
      if (question.type === "multiple") {
        for (const exclusive of question.exclusiveOptionIds ?? []) {
          if (!optionIds.includes(exclusive)) problems.push(`"${key}": la opción exclusiva "${exclusive}" no existe`);
        }
      }
    }
    if (question.type === "scale" && question.min >= question.max) problems.push(`"${key}": escala inválida`);
  }

  // Todos los pasos alcanzables desde el inicio, y sin ciclos.
  const reachable = new Set<StepId>();
  const visiting = new Set<StepId>();
  const visit = (id: StepId) => {
    if (!q.steps[id]) return;
    if (visiting.has(id)) {
      problems.push(`hay un ciclo que pasa por "${id}"`);
      return;
    }
    if (reachable.has(id)) return;
    reachable.add(id);
    visiting.add(id);
    const { next } = q.steps[id];
    for (const target of [next.default, ...(next.branches ?? []).map((b) => b.to)]) {
      if (target !== END) visit(target);
    }
    visiting.delete(id);
  };
  visit(q.start);
  for (const id of ids) if (!reachable.has(id)) problems.push(`"${id}" es inalcanzable`);

  return problems;
}
