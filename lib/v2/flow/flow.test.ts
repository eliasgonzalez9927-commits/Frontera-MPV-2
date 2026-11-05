import { describe, expect, it } from "vitest";
import { demoComplaints } from "../fixtures/demoComplaints";
import { validateComplaint } from "../validation/complaint";
import { getGuardRedirect, getNextRoute, getPreviousRoute, questionRoute, routes } from "./routes";
import { flowReducer, hasProgress, initialFlowState, type FlowState } from "./state";

// Fecha fija: las validaciones de fecha de nacimiento dependen de "hoy".
const NOW = new Date(2026, 5, 15);

const reduce = (state: FlowState, ...actions: Parameters<typeof flowReducer>[1][]) =>
  actions.reduce(flowReducer, state);

describe("flowReducer", () => {
  it("guarda el contexto del paciente", () => {
    expect(reduce(initialFlowState, { type: "setContext", value: "self" }).patientContext).toBe("self");
  });

  it("descarta el vínculo al volver a 'para mí' (evita estado imposible)", () => {
    const state = reduce(
      initialFlowState,
      { type: "setContext", value: "other" },
      { type: "setRelationship", value: "minor" },
      { type: "setContext", value: "self" }
    );
    expect(state.relationship).toBeNull();
  });

  it("conserva el vínculo si se vuelve a elegir 'otra persona'", () => {
    const state = reduce(
      initialFlowState,
      { type: "setContext", value: "other" },
      { type: "setRelationship", value: "cannot_respond" },
      { type: "setContext", value: "other" }
    );
    expect(state.relationship).toBe("cannot_respond");
  });

  it("ignora un vínculo cuando la consulta es para uno mismo", () => {
    const state = reduce(
      initialFlowState,
      { type: "setContext", value: "self" },
      { type: "setRelationship", value: "minor" }
    );
    expect(state.relationship).toBeNull();
  });

  it("conserva el texto del motivo exactamente como se escribió", () => {
    const raw = "  me duele   la panza\n\ndesde ayer  ";
    expect(reduce(initialFlowState, { type: "setComplaint", value: raw }).complaint).toBe(raw);
  });

  it("un ejemplo de demostración carga texto y escenario; limpiar los quita", () => {
    const loaded = reduce(initialFlowState, {
      type: "loadDemoComplaint",
      scenario: "abdominal",
      text: "texto de ejemplo",
    });
    expect(loaded).toMatchObject({ complaint: "texto de ejemplo", demoScenario: "abdominal" });
    const cleared = reduce(loaded, { type: "clearComplaint" });
    expect(cleared).toMatchObject({ complaint: "", demoScenario: null });
  });

  it("reset vuelve al estado inicial", () => {
    const state = reduce(
      initialFlowState,
      { type: "setContext", value: "other" },
      { type: "setComplaint", value: "algo" },
      { type: "reset" }
    );
    expect(state).toEqual(initialFlowState);
  });

  it("hasProgress detecta si hay algo cargado", () => {
    expect(hasProgress(initialFlowState)).toBe(false);
    expect(hasProgress(reduce(initialFlowState, { type: "setComplaint", value: "x" }))).toBe(true);
    expect(hasProgress(reduce(initialFlowState, { type: "setContext", value: "self" }))).toBe(true);
  });
});

describe("navegación", () => {
  const self = reduce(initialFlowState, { type: "setContext", value: "self" });
  const other = reduce(initialFlowState, { type: "setContext", value: "other" });

  it("'para mí' salta la pantalla de vínculo", () => {
    expect(getNextRoute(self, routes.context)).toBe(routes.info);
    expect(getPreviousRoute(self, routes.info)).toBe(routes.context);
  });

  it("'otra persona' pasa por la pantalla de vínculo y vuelve por ella", () => {
    expect(getNextRoute(other, routes.context)).toBe(routes.relation);
    expect(getNextRoute(other, routes.relation)).toBe(routes.info);
    expect(getPreviousRoute(other, routes.info)).toBe(routes.relation);
  });

  it("recorre el camino completo hasta las preguntas", () => {
    expect(getNextRoute(self, routes.welcome)).toBe(routes.context);
    expect(getNextRoute(self, routes.info)).toBe(routes.complaint);
    // Sin ejemplo elegido, el recorrido es el genérico "no identificado".
    expect(getNextRoute(self, routes.complaint)).toBe(questionRoute("un_feel"));
  });

  it("la primera pantalla no tiene anterior", () => {
    expect(getPreviousRoute(self, routes.welcome)).toBeNull();
  });
});

describe("guardas de acceso", () => {
  const ready = reduce(
    initialFlowState,
    { type: "setContext", value: "self" },
    { type: "setAcknowledged", value: true },
    { type: "setComplaint", value: "me duele la cabeza" }
  );

  it("sin responder el contexto, todo redirige a P02", () => {
    expect(getGuardRedirect(initialFlowState, routes.info, NOW)).toBe(routes.context);
    expect(getGuardRedirect(initialFlowState, routes.complaint, NOW)).toBe(routes.context);
    expect(getGuardRedirect(initialFlowState, routes.questions, NOW)).toBe(routes.context);
  });

  it("el vínculo solo es accesible para 'otra persona'", () => {
    expect(getGuardRedirect(ready, routes.relation, NOW)).toBe(routes.context);
    const other = reduce(initialFlowState, { type: "setContext", value: "other" });
    expect(getGuardRedirect(other, routes.relation, NOW)).toBeNull();
  });

  it("'otra persona' sin vínculo no puede pasar a P03", () => {
    const other = reduce(initialFlowState, { type: "setContext", value: "other" });
    expect(getGuardRedirect(other, routes.info, NOW)).toBe(routes.context);
  });

  it("sin confirmar la lectura no se accede al motivo", () => {
    const state = reduce(initialFlowState, { type: "setContext", value: "self" });
    expect(getGuardRedirect(state, routes.complaint, NOW)).toBe(routes.info);
  });

  it("sin motivo válido no se accede a las preguntas", () => {
    const noComplaint = reduce(ready, { type: "clearComplaint" });
    expect(getGuardRedirect(noComplaint, routes.questions, NOW)).toBe(routes.complaint);
    // El índice de preguntas redirige a la primera pregunta del recorrido.
    expect(getGuardRedirect(ready, routes.questions, NOW)).toBe(questionRoute("un_feel"));
  });
});

describe("validateComplaint", () => {
  it("rechaza vacío y solo espacios", () => {
    expect(validateComplaint("")).not.toBeNull();
    expect(validateComplaint("   \n  ")).not.toBeNull();
  });

  it("acepta cualquier texto con contenido, sin interpretarlo", () => {
    expect(validateComplaint("me duele")).toBeNull();
    expect(validateComplaint("no sé qué tengo")).toBeNull();
  });
});

describe("ejemplos de demostración", () => {
  it("hay uno por recorrido de P05", () => {
    expect(demoComplaints.map((d) => d.id).sort()).toEqual(["abdominal", "musculoskeletal", "unidentified"]);
  });

  it("todos pasan la validación de interfaz", () => {
    for (const demo of demoComplaints) expect(validateComplaint(demo.text)).toBeNull();
  });
});
