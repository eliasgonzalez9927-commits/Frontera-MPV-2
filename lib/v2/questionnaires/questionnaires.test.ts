import { describe, expect, it } from "vitest";
import {
  getGuardRedirect,
  getNextAfterQuestion,
  getPreviousBeforeQuestion,
  getPreviousRoute,
  getQuestionGuardRedirect,
  questionRoute,
  routes,
} from "../flow/routes";
import { flowReducer, initialFlowState, type FlowAction, type FlowState } from "../flow/state";
import { abdominal, musculoskeletal, unidentified } from "./definitions";
import {
  getFirstInvalidStep,
  getFirstPendingStep,
  getPath,
  getPreviousStep,
  getStepGuard,
  isQuestionnaireComplete,
  pruneOrphanAnswers,
  resolveNext,
  validateQuestionnaire,
} from "./engine";
import { formatAnswer } from "./format";
import { questionnaireForState, questionnaires } from "./index";
import { toggleMultiple } from "./selection";
import { END, type Answers, type Question, type Questionnaire } from "./types";
import { validateAnswer } from "./validation";

// Fecha fija: las validaciones de fecha de nacimiento dependen de "hoy".
const NOW = new Date(2026, 5, 15);

const apply = (state: FlowState, ...actions: FlowAction[]) => actions.reduce(flowReducer, state);

describe("definiciones de los recorridos de demostración", () => {
  it.each(Object.values(questionnaires))("$name es consistente (sin ciclos ni pasos huérfanos)", (q) => {
    expect(validateQuestionnaire(q)).toEqual([]);
  });

  it("entre los tres recorridos se usan los 6 tipos de pregunta", () => {
    const types = new Set(
      Object.values(questionnaires).flatMap((q) => Object.values(q.steps).map((step) => step.type))
    );
    expect([...types].sort()).toEqual(["confirm", "info", "multiple", "scale", "single", "text"]);
  });

  it("los textos no contienen recomendaciones, diagnósticos ni lenguaje de gravedad", () => {
    const text = JSON.stringify(Object.values(questionnaires)).toLowerCase();
    for (const forbidden of ["diagnóstico es", "te recomendamos", "tomá ", "medicación", "gravedad", "prioridad"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

describe("validateQuestionnaire detecta definiciones rotas", () => {
  const base: Questionnaire = {
    id: "unidentified",
    name: "x",
    start: "a",
    steps: {
      a: { id: "a", type: "info", required: false, title: "a", next: { default: "b" } },
      b: { id: "b", type: "info", required: false, title: "b", next: { default: END } },
    },
  };
  const withStep = (step: Question): Questionnaire => ({ ...base, steps: { ...base.steps, [step.id]: step } });

  it("acepta una definición válida", () => expect(validateQuestionnaire(base)).toEqual([]));

  it("detecta un destino inexistente", () => {
    const q = withStep({ id: "b", type: "info", required: false, title: "b", next: { default: "zzz" } });
    expect(validateQuestionnaire(q).join()).toContain("zzz");
  });

  it("detecta un ciclo", () => {
    const q = withStep({ id: "b", type: "info", required: false, title: "b", next: { default: "a" } });
    expect(validateQuestionnaire(q).join()).toContain("ciclo");
  });

  it("detecta un paso inalcanzable", () => {
    const q = withStep({ id: "c", type: "info", required: false, title: "c", next: { default: END } });
    expect(validateQuestionnaire(q).join()).toContain("inalcanzable");
  });

  it("detecta opciones repetidas y una opción exclusiva inexistente", () => {
    const q = withStep({
      id: "b",
      type: "multiple",
      required: false,
      title: "b",
      options: [
        { id: "x", label: "X" },
        { id: "x", label: "X2" },
      ],
      exclusiveOptionIds: ["nope"],
      next: { default: END },
    });
    const problems = validateQuestionnaire(q).join();
    expect(problems).toContain("repetidas");
    expect(problems).toContain("nope");
  });
});

describe("navegación condicional", () => {
  it("musculoesquelético: un golpe pasa por el relato; otro origen lo salta", () => {
    const withBlow: Answers = { ms_zone: "leg", ms_how: "blow" };
    expect(resolveNext(musculoskeletal, "ms_how", withBlow)).toBe("ms_event");
    expect(getPath(musculoskeletal, withBlow)).toContain("ms_event");

    const withEffort: Answers = { ms_zone: "leg", ms_how: "effort" };
    expect(resolveNext(musculoskeletal, "ms_how", withEffort)).toBe("ms_scale");
    expect(getPath(musculoskeletal, withEffort)).not.toContain("ms_event");
  });

  it("abdominal: elegir 'Vómitos' agrega la pregunta de detalle", () => {
    expect(resolveNext(abdominal, "ab_with", { ab_with: ["nausea", "vomit"] })).toBe("ab_vomit_note");
    expect(resolveNext(abdominal, "ab_with", { ab_with: ["nausea"] })).toBe("ab_scale");
    expect(resolveNext(abdominal, "ab_with", {})).toBe("ab_scale");
  });

  it("no identificado: 'dolor en alguna parte' pide la ubicación", () => {
    expect(resolveNext(unidentified, "un_feel", { un_feel: "pain" })).toBe("un_where");
    expect(resolveNext(unidentified, "un_feel", { un_feel: "tired" })).toBe("un_since");
  });

  it("el camino siempre termina en END y cada recorrido tiene al menos 5 pasos", () => {
    for (const q of Object.values(questionnaires)) {
      const path = getPath(q, {});
      expect(path.length).toBeGreaterThanOrEqual(5);
      expect(resolveNext(q, path[path.length - 1], {})).toBe(END);
    }
  });

  it("getPreviousStep sigue el camino real, no el orden de definición", () => {
    const answers: Answers = { ms_zone: "arm", ms_how: "effort" };
    expect(getPreviousStep(musculoskeletal, answers, "ms_scale")).toBe("ms_how");
    expect(getPreviousStep(musculoskeletal, { ...answers, ms_how: "blow" }, "ms_scale")).toBe("ms_event");
    expect(getPreviousStep(musculoskeletal, answers, "ms_zone")).toBeNull();
  });
});

describe("edición: cambiar una respuesta actualiza las posteriores", () => {
  it("al cambiar la rama se descartan las respuestas que dejaron de aplicar", () => {
    const answers: Answers = { ms_zone: "leg", ms_how: "blow", ms_event: "Me caí", ms_scale: 4 };
    // La persona vuelve y cambia "golpe" por "esfuerzo": ms_event deja de pertenecer al camino.
    const edited: Answers = { ...answers, ms_how: "effort" };
    const { answers: pruned, removed } = pruneOrphanAnswers(musculoskeletal, edited);
    expect(removed).toEqual(["ms_event"]);
    expect(pruned).toEqual({ ms_zone: "leg", ms_how: "effort", ms_scale: 4 });
  });

  it("si el cambio no altera el camino, no se descarta nada", () => {
    const { removed } = pruneOrphanAnswers(musculoskeletal, { ms_zone: "arm", ms_how: "effort", ms_scale: 2 });
    expect(removed).toEqual([]);
  });

  it("al volver a la rama anterior la respuesta descartada no reaparece", () => {
    const { answers } = pruneOrphanAnswers(musculoskeletal, { ms_zone: "leg", ms_how: "effort", ms_event: "x" });
    expect(answers.ms_event).toBeUndefined();
  });
});

describe("guardas y completitud", () => {
  it("no se puede entrar a una pregunta con una obligatoria previa sin responder", () => {
    expect(getStepGuard(abdominal, {}, "ab_since")).toBe("ab_where");
    expect(getStepGuard(abdominal, { ab_where: "all" }, "ab_since")).toBeNull();
  });

  it("una pregunta opcional sin responder no bloquea las siguientes", () => {
    const answers: Answers = { ab_where: "all", ab_since: "day" };
    expect(getStepGuard(abdominal, answers, "ab_scale")).toBeNull();
  });

  it("un paso fuera del camino redirige al primero pendiente", () => {
    const answers: Answers = { ms_zone: "arm", ms_how: "effort" };
    expect(getStepGuard(musculoskeletal, answers, "ms_event")).toBe("ms_scale");
  });

  it("un id desconocido vuelve al inicio", () => {
    expect(getStepGuard(abdominal, {}, "nope")).toBe("ab_where");
  });

  it("el cuestionario está completo solo con todas las obligatorias del camino", () => {
    const answers: Answers = { ab_where: "all", ab_since: "day", ab_scale: 3 };
    expect(getFirstInvalidStep(abdominal, answers)).toBe("ab_confirm");
    expect(isQuestionnaireComplete(abdominal, answers)).toBe(false);
    expect(isQuestionnaireComplete(abdominal, { ...answers, ab_confirm: true })).toBe(true);
  });
});

describe("getFirstPendingStep (edición)", () => {
  const answers: Answers = { ab_where: "all", ab_since: "day", ab_scale: 3, ab_confirm: true };

  it("devuelve el primer paso inválido o no visto, en el orden del camino", () => {
    expect(getFirstPendingStep(abdominal, answers, {})).toBe("ab_where");
    expect(getFirstPendingStep(abdominal, answers, { ab_where: true })).toBe("ab_since");
  });

  it("un opcional o informativo no visto cuenta como pendiente; uno visto no", () => {
    const seen = { ab_where: true, ab_since: true, ab_scale: true, ab_confirm: true } as const;
    expect(getFirstPendingStep(abdominal, answers, seen)).toBe("ab_with");
    expect(getFirstPendingStep(abdominal, answers, { ...seen, ab_with: true })).toBe("ab_info");
    expect(getFirstPendingStep(abdominal, answers, { ...seen, ab_with: true, ab_info: true })).toBeNull();
  });

  it("un obligatorio sin responder es pendiente aunque esté 'visto'", () => {
    const seen = { ab_where: true, ab_since: true, ab_with: true, ab_scale: true, ab_info: true, ab_confirm: true } as const;
    expect(getFirstPendingStep(abdominal, { ...answers, ab_scale: undefined as never }, seen)).toBe("ab_scale");
  });
});

describe("validateAnswer por tipo", () => {
  it("única: obligatoria vacía falla; opción desconocida falla", () => {
    const single = abdominal.steps.ab_where;
    expect(validateAnswer(single, undefined)).not.toBeNull();
    expect(validateAnswer(single, "zzz")).not.toBeNull();
    expect(validateAnswer(single, "all")).toBeNull();
  });

  it("múltiple opcional vacía es válida; opción desconocida falla", () => {
    const multiple = abdominal.steps.ab_with;
    expect(validateAnswer(multiple, undefined)).toBeNull();
    expect(validateAnswer(multiple, [])).toBeNull();
    expect(validateAnswer(multiple, ["zzz"])).not.toBeNull();
  });

  it("texto obligatorio respeta largo mínimo y máximo", () => {
    const text = unidentified.steps.un_where;
    expect(validateAnswer(text, "")).not.toBeNull();
    expect(validateAnswer(text, "  ab ")).not.toBeNull();
    expect(validateAnswer(text, "costado")).toBeNull();
    expect(validateAnswer(text, "x".repeat(301))).not.toBeNull();
  });

  it("texto opcional vacío es válido", () => {
    expect(validateAnswer(unidentified.steps.un_more, "")).toBeNull();
  });

  it("escala exige un entero dentro del rango", () => {
    const scale = abdominal.steps.ab_scale;
    expect(validateAnswer(scale, undefined)).not.toBeNull();
    expect(validateAnswer(scale, 0)).toBeNull();
    expect(validateAnswer(scale, 10)).toBeNull();
    expect(validateAnswer(scale, 11)).not.toBeNull();
    expect(validateAnswer(scale, 2.5)).not.toBeNull();
  });

  it("confirmación obligatoria solo acepta true", () => {
    const confirm = abdominal.steps.ab_confirm;
    expect(validateAnswer(confirm, undefined)).not.toBeNull();
    expect(validateAnswer(confirm, false)).not.toBeNull();
    expect(validateAnswer(confirm, true)).toBeNull();
  });

  it("la información contextual nunca bloquea", () => {
    expect(validateAnswer(abdominal.steps.ab_info, undefined)).toBeNull();
  });

  it("minSelected / maxSelected de selección múltiple", () => {
    const multiple = { ...abdominal.steps.ab_with, validation: { minSelected: 2, maxSelected: 3 } } as Question;
    expect(validateAnswer(multiple, ["nausea"])).toContain("2");
    expect(validateAnswer(multiple, ["nausea", "vomit"])).toBeNull();
    expect(validateAnswer(multiple, ["nausea", "vomit", "diarrhea", "appetite"])).toContain("3");
  });
});

describe("toggleMultiple (opciones exclusivas)", () => {
  const q = abdominal.steps.ab_with;
  if (q.type !== "multiple") throw new Error("ab_with debe ser de selección múltiple");

  it("agrega y quita opciones normales", () => {
    expect(toggleMultiple(q, [], "nausea", true)).toEqual(["nausea"]);
    expect(toggleMultiple(q, ["nausea"], "vomit", true)).toEqual(["nausea", "vomit"]);
    expect(toggleMultiple(q, ["nausea", "vomit"], "nausea", false)).toEqual(["vomit"]);
  });

  it("elegir 'Nada de esto' desmarca las demás", () => {
    expect(toggleMultiple(q, ["nausea", "vomit"], "none", true)).toEqual(["none"]);
  });

  it("elegir otra opción desmarca 'Nada de esto'", () => {
    expect(toggleMultiple(q, ["none"], "diarrhea", true)).toEqual(["diarrhea"]);
  });
});

describe("formatAnswer", () => {
  it("muestra etiquetas legibles", () => {
    expect(formatAnswer(abdominal.steps.ab_where, "all")).toBe("En toda la panza");
    expect(formatAnswer(abdominal.steps.ab_with, ["nausea", "vomit"])).toBe("Náuseas, Vómitos");
    expect(formatAnswer(abdominal.steps.ab_scale, 7)).toBe("7 de 10");
    expect(formatAnswer(abdominal.steps.ab_confirm, true)).toBe("Confirmado");
    expect(formatAnswer(unidentified.steps.un_more, "  hola ")).toBe("  hola ");
  });

  it("devuelve null si no hay nada que mostrar", () => {
    expect(formatAnswer(abdominal.steps.ab_info, undefined)).toBeNull();
    expect(formatAnswer(abdominal.steps.ab_with, [])).toBeNull();
    expect(formatAnswer(unidentified.steps.un_more, "   ")).toBeNull();
    expect(formatAnswer(abdominal.steps.ab_confirm, undefined)).toBeNull();
  });
});

describe("integración con el estado del recorrido", () => {
  const ready = (scenario?: "abdominal"): FlowState => {
    const s = apply(
      initialFlowState,
      { type: "setContext", value: "self" },
      { type: "setAcknowledged", value: true }
    );
    return scenario
      ? apply(s, { type: "loadDemoComplaint", scenario, text: "Me duele la panza desde anoche" })
      : apply(s, { type: "setComplaint", value: "no me siento bien" });
  };

  it("el recorrido sale del ejemplo elegido; sin ejemplo es el genérico", () => {
    expect(questionnaireForState(ready("abdominal")).id).toBe("abdominal");
    expect(questionnaireForState(ready()).id).toBe("unidentified");
  });

  it("setAnswer guarda y null quita", () => {
    let s = apply(ready("abdominal"), { type: "setAnswer", id: "ab_where", value: "all" });
    expect(s.answers.ab_where).toBe("all");
    s = apply(s, { type: "setAnswer", id: "ab_where", value: null });
    expect(s.answers).toEqual({});
  });

  it("cambiar de ejemplo (otro recorrido) descarta las respuestas; mantener el mismo no", () => {
    let s = apply(ready("abdominal"), { type: "setAnswer", id: "ab_where", value: "all" });
    s = apply(s, { type: "loadDemoComplaint", scenario: "abdominal", text: "otro texto" });
    expect(s.answers.ab_where).toBe("all");
    s = apply(s, { type: "loadDemoComplaint", scenario: "musculoskeletal", text: "otro" });
    expect(s.answers).toEqual({});
  });

  it("quitar el ejemplo vuelve al recorrido genérico y descarta respuestas", () => {
    let s = apply(ready("abdominal"), { type: "setAnswer", id: "ab_where", value: "all" });
    s = apply(s, { type: "clearComplaint" });
    expect(s.answers).toEqual({});
    expect(questionnaireForState(s).id).toBe("unidentified");
  });

  it("las rutas de preguntas siguen el recorrido: siguiente, anterior y fin", () => {
    let s = ready("abdominal");
    expect(getNextAfterQuestion(s, "ab_where")).toBe(questionRoute("ab_since"));
    expect(getPreviousBeforeQuestion(s, "ab_where")).toBe(routes.complaint);
    expect(getPreviousBeforeQuestion(s, "ab_since")).toBe(questionRoute("ab_where"));
    expect(getNextAfterQuestion(s, "ab_confirm")).toBe(routes.identification);

    s = apply(s, { type: "setAnswer", id: "ab_with", value: ["vomit"] });
    expect(getNextAfterQuestion(s, "ab_with")).toBe(questionRoute("ab_vomit_note"));
  });

  it("P06 vuelve a la última pregunta del camino", () => {
    expect(getPreviousRoute(ready("abdominal"), routes.identification)).toBe(questionRoute("ab_confirm"));
  });

  it("guardas de P05 y P06", () => {
    const s = ready("abdominal");
    expect(getQuestionGuardRedirect(s, "ab_since")).toBe(questionRoute("ab_where"));
    expect(
      getQuestionGuardRedirect(apply(s, { type: "setAnswer", id: "ab_where", value: "all" }), "ab_since")
    ).toBeNull();

    // P06 exige el cuestionario completo
    expect(getGuardRedirect(s, routes.identification, NOW)).toBe(questionRoute("ab_where"));
    const complete = apply(
      s,
      { type: "setAnswer", id: "ab_where", value: "all" },
      { type: "setAnswer", id: "ab_since", value: "day" },
      { type: "setAnswer", id: "ab_scale", value: 4 },
      { type: "setAnswer", id: "ab_confirm", value: true }
    );
    expect(getGuardRedirect(complete, routes.identification, NOW)).toBeNull();
  });

  it("sin los pasos previos, las preguntas redirigen a P02", () => {
    expect(getQuestionGuardRedirect(initialFlowState, "ab_where")).toBe(routes.context);
  });
});
