import { describe, expect, it } from "vitest";
import { buildDemoIdentification } from "../fixtures/demoIdentity";
import { demoComplaints } from "../fixtures/demoComplaints";
import { flowReducer, initialFlowState, type FlowAction, type FlowState } from "../flow/state";
import { getAnswerText, getBotMessage } from "./script";
import { CONTACT_SEEN_KEY, getActiveIndex, getChatTurns, getVisibleTurns } from "./turns";

const NOW = new Date(2026, 5, 15);
const reduce = (state: FlowState, ...actions: FlowAction[]) => actions.reduce(flowReducer, state);
const active = (state: FlowState) => {
  const turns = getChatTurns(state, NOW);
  return turns[getActiveIndex(turns)];
};

describe("turnos de la conversación", () => {
  it("empieza por preguntar para quién es la consulta", () => {
    expect(active(initialFlowState)?.kind).toBe("context");
  });

  it("pide el vínculo solo si la consulta es para otra persona", () => {
    const self = reduce(initialFlowState, { type: "setContext", value: "self" });
    expect(getChatTurns(self, NOW).some((t) => t.kind === "relationship")).toBe(false);
    expect(active(self)?.kind).toBe("ack");

    const other = reduce(initialFlowState, { type: "setContext", value: "other" });
    expect(active(other)?.kind).toBe("relationship");
  });

  it("avanza por lectura, motivo y cuestionario del ejemplo elegido", () => {
    const demo = demoComplaints.find((d) => d.id === "musculoskeletal")!;
    const state = reduce(
      initialFlowState,
      { type: "setContext", value: "self" },
      { type: "setAcknowledged", value: true },
      { type: "loadDemoComplaint", scenario: demo.id, text: demo.text }
    );
    const turn = active(state);
    expect(turn?.kind).toBe("question");
    expect(turn?.stepId).toBe("ms_zone");
  });

  const unidentifiedStart = () => {
    const demo = demoComplaints.find((d) => d.id === "unidentified")!;
    return reduce(
      initialFlowState,
      { type: "setContext", value: "self" },
      { type: "setAcknowledged", value: true },
      { type: "loadDemoComplaint", scenario: demo.id, text: demo.text }
    );
  };

  it("una pregunta obligatoria sigue pendiente aunque se haya visto", () => {
    let state = unidentifiedStart();
    expect(active(state)?.stepId).toBe("un_feel");
    state = reduce(state, { type: "markSeen", id: "un_feel" });
    expect(active(state)?.stepId).toBe("un_feel");
  });

  it("una pregunta opcional queda pendiente hasta omitirla", () => {
    let state = reduce(
      unidentifiedStart(),
      { type: "setAnswer", id: "un_feel", value: "general" },
      { type: "setAnswer", id: "un_since", value: "today" }
    );
    expect(active(state)?.stepId).toBe("un_more");
    state = reduce(state, { type: "markSeen", id: "un_more" });
    expect(active(state)?.stepId).toBe("un_info");
  });

  it("recorre todo el cuestionario y pasa a los datos de identificación", () => {
    const state = reduce(
      unidentifiedStart(),
      { type: "setAnswer", id: "un_feel", value: "general" },
      { type: "setAnswer", id: "un_since", value: "today" },
      { type: "markSeen", id: "un_more" },
      { type: "markSeen", id: "un_info" },
      { type: "setAnswer", id: "un_confirm", value: true }
    );
    expect(active(state)?.kind).toBe("id_name");
  });

  it("un cambio de rama agrega la pregunta nueva como pendiente", () => {
    const state = reduce(
      unidentifiedStart(),
      { type: "setAnswer", id: "un_feel", value: "general" },
      { type: "setAnswer", id: "un_since", value: "today" },
      { type: "setAnswer", id: "un_feel", value: "pain" }
    );
    expect(active(state)?.stepId).toBe("un_where");
  });

  it("los datos de ejemplo completan identificación y contacto", () => {
    const state = reduce(
      { ...initialFlowState, patientContext: "self", readAcknowledged: true, complaint: "Me duele la panza desde anoche." },
      { type: "setIdentification", patch: buildDemoIdentification(null, NOW) },
      { type: "markSeen", id: CONTACT_SEEN_KEY }
    );
    const turns = getChatTurns(state, NOW).filter((t) => t.kind.startsWith("id_"));
    expect(turns.every((t) => t.done)).toBe(true);
  });

  it("el contacto es opcional pero requiere pasar por la pregunta", () => {
    const base = reduce(initialFlowState, { type: "setIdentification", patch: buildDemoIdentification(null, NOW) });
    const contact = getChatTurns(base, NOW).find((t) => t.kind === "id_contact")!;
    expect(contact.done).toBe(false);
  });
});

describe("turnos visibles", () => {
  it("muestra hasta el turno pendiente", () => {
    const state = reduce(initialFlowState, { type: "setContext", value: "self" });
    const turns = getChatTurns(state, NOW);
    const visible = getVisibleTurns(turns, null);
    expect(visible.map((t) => t.key)).toEqual(["context", "ack"]);
  });

  it("al corregir un turno, oculta los posteriores", () => {
    const state = reduce(initialFlowState, { type: "setContext", value: "self" }, { type: "setAcknowledged", value: true });
    const visible = getVisibleTurns(getChatTurns(state, NOW), "context");
    expect(visible.map((t) => t.key)).toEqual(["context"]);
  });
});

describe("guion", () => {
  it("adapta el tono según para quién es la consulta", () => {
    const turn = { key: "complaint", kind: "complaint" as const, done: false };
    const self = reduce(initialFlowState, { type: "setContext", value: "self" });
    const other = reduce(initialFlowState, { type: "setContext", value: "other" });
    expect(getBotMessage(turn, self).text).toBe("¿Qué te está pasando?");
    expect(getBotMessage(turn, other).text).toBe("¿Qué le está pasando?");
  });

  it("muestra la respuesta de la persona tal cual la dio", () => {
    const state = reduce(initialFlowState, { type: "setContext", value: "self" }, { type: "setComplaint", value: "Me duele la panza." });
    expect(getAnswerText({ key: "context", kind: "context", done: true }, state)).toBe("Para mí");
    expect(getAnswerText({ key: "complaint", kind: "complaint", done: true }, state)).toBe("Me duele la panza.");
  });

  it("una pregunta omitida se muestra como omitida", () => {
    const demo = demoComplaints.find((d) => d.id === "unidentified")!;
    const state = reduce(
      initialFlowState,
      { type: "loadDemoComplaint", scenario: demo.id, text: demo.text },
      { type: "markSeen", id: "un_more" }
    );
    expect(getAnswerText({ key: "q:un_more", kind: "question", stepId: "un_more", done: true }, state)).toBe("Omitida");
  });
});
