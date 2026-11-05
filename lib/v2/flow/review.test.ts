import { describe, expect, it } from "vitest";
import { buildEpisodeCode } from "./episode";
import { buildReview, getBirthDateNotice } from "./review";
import {
  getGuardRedirect,
  getPreviousRoute,
  getNextRoute,
  getResumeRoute,
  questionRoute,
  resolveBack,
  resolveContinue,
  routes,
} from "./routes";
import { flowReducer, hasProgress, initialFlowState, type FlowAction, type FlowState } from "./state";

const NOW = new Date(2026, 5, 15);
const apply = (state: FlowState, ...actions: FlowAction[]) => actions.reduce(flowReducer, state);

const identification = {
  firstName: "Persona",
  lastName: "De Prueba",
  documentType: "dni" as const,
  documentNumber: "00000000",
  birthDay: "15",
  birthMonth: "6",
  birthYear: "1990",
  contact: "",
};

// Recorrido "dolor de panza" completo, para uno mismo.
const complete = apply(
  initialFlowState,
  { type: "setContext", value: "self" },
  { type: "setAcknowledged", value: true },
  { type: "loadDemoComplaint", scenario: "abdominal", text: "Me duele la panza desde anoche" },
  { type: "setAnswer", id: "ab_where", value: "all" },
  { type: "setAnswer", id: "ab_since", value: "day" },
  { type: "setAnswer", id: "ab_scale", value: 6 },
  { type: "setAnswer", id: "ab_confirm", value: true },
  // En la app, cada pregunta se marca como vista al continuar (o al omitir).
  ...["ab_where", "ab_since", "ab_with", "ab_scale", "ab_info", "ab_confirm"].map(
    (id): FlowAction => ({ type: "markSeen", id })
  ),
  { type: "setIdentification", patch: identification }
);

describe("getResumeRoute (qué falta, en orden)", () => {
  it("un recorrido completo no tiene pendientes", () => {
    expect(getResumeRoute(complete, NOW)).toBeNull();
  });

  it("recorre los pendientes en el orden del recorrido", () => {
    expect(getResumeRoute(initialFlowState, NOW)).toBe(routes.context);
    expect(getResumeRoute(apply(initialFlowState, { type: "setContext", value: "other" }), NOW)).toBe(routes.relation);
    expect(getResumeRoute(apply(initialFlowState, { type: "setContext", value: "self" }), NOW)).toBe(routes.info);
    const acked = apply(initialFlowState, { type: "setContext", value: "self" }, { type: "setAcknowledged", value: true });
    expect(getResumeRoute(acked, NOW)).toBe(routes.complaint);
  });

  it("sigue por la primera pregunta obligatoria sin responder", () => {
    const state = apply(complete, { type: "setAnswer", id: "ab_scale", value: null });
    expect(getResumeRoute(state, NOW)).toBe(questionRoute("ab_scale"));
  });

  it("al final pide los datos si no son válidos", () => {
    const state = apply(complete, { type: "setIdentification", patch: { birthYear: "" } });
    expect(getResumeRoute(state, NOW)).toBe(routes.identification);
  });

  it("si se cambia a 'otra persona' sin vínculo, falta el vínculo", () => {
    expect(getResumeRoute(apply(complete, { type: "setContext", value: "other" }), NOW)).toBe(routes.relation);
  });

  it("si cambia el recorrido por un nuevo ejemplo, falta responder el nuevo cuestionario", () => {
    const state = apply(complete, { type: "loadDemoComplaint", scenario: "musculoskeletal", text: "Me torcí el tobillo" });
    expect(getResumeRoute(state, NOW)).toBe(questionRoute("ms_zone"));
  });
});

describe("edición desde la revisión", () => {
  const editing = apply(complete, { type: "startEdit" });

  it("fuera del modo edición, continuar sigue el recorrido normal", () => {
    expect(resolveContinue(complete, routes.info, NOW)).toBe(routes.info);
  });

  it("editando con todo completo, continuar vuelve a la revisión", () => {
    expect(resolveContinue(editing, questionRoute("ab_since"), NOW)).toBe(routes.review);
  });

  it("editando, si quedó algo pendiente continúa por eso y recién después vuelve", () => {
    const changed = apply(editing, { type: "loadDemoComplaint", scenario: "musculoskeletal", text: "Me torcí el tobillo" });
    expect(resolveContinue(changed, routes.questions, NOW)).toBe(questionRoute("ms_zone"));
  });

  it("editando, una pregunta nueva que se abre (aunque sea opcional) se muestra una vez", () => {
    const withVomit = apply(editing, { type: "setAnswer", id: "ab_with", value: ["vomit"] });
    // Todavía no la vio: se le pregunta, aunque no sea obligatoria.
    expect(resolveContinue(withVomit, questionRoute("ab_scale"), NOW)).toBe(questionRoute("ab_vomit_note"));
    // Una vez vista (respondida u omitida), no se vuelve a pedir.
    const seen = apply(withVomit, { type: "markSeen", id: "ab_vomit_note" });
    expect(resolveContinue(seen, questionRoute("ab_scale"), NOW)).toBe(routes.review);
  });

  it("editando, un recorrido nuevo se recorre completo, incluidas las preguntas opcionales", () => {
    let state = apply(editing, { type: "loadDemoComplaint", scenario: "musculoskeletal", text: "Me torcí el tobillo" });
    const required = [
      { id: "ms_zone", value: "leg" },
      { id: "ms_how", value: "effort" },
      { id: "ms_scale", value: 4 },
    ];
    for (const { id, value } of required) {
      state = apply(state, { type: "setAnswer", id, value }, { type: "markSeen", id });
    }
    // El paso opcional ms_notice nunca se vio: no se saltea.
    expect(resolveContinue(state, routes.review, NOW)).toBe(questionRoute("ms_notice"));
    state = apply(state, { type: "markSeen", id: "ms_notice" });
    expect(resolveContinue(state, routes.review, NOW)).toBe(questionRoute("ms_confirm"));
    state = apply(state, { type: "setAnswer", id: "ms_confirm", value: true }, { type: "markSeen", id: "ms_confirm" });
    expect(resolveContinue(state, routes.review, NOW)).toBe(routes.review);
  });

  it("volver, con todo completo, regresa a la revisión; con algo pendiente retrocede normalmente", () => {
    expect(resolveBack(editing, routes.info, NOW)).toBe(routes.review);
    expect(resolveBack(complete, routes.info, NOW)).toBe(routes.info);
    const pending = apply(editing, { type: "setContext", value: "other" });
    expect(resolveBack(pending, routes.welcome, NOW)).toBe(routes.welcome);
  });

  it("startEdit / finishEdit solo cambian la bandera", () => {
    expect(editing.editFromReview).toBe(true);
    expect(apply(editing, { type: "finishEdit" }).editFromReview).toBe(false);
    expect(apply(editing, { type: "startEdit" })).toBe(editing);
  });
});

describe("guardas de la revisión y del pase", () => {
  it("la revisión exige todo completo; si falta algo, lleva a lo pendiente", () => {
    expect(getGuardRedirect(complete, routes.review, NOW)).toBeNull();
    expect(getGuardRedirect(initialFlowState, routes.review, NOW)).toBe(routes.context);
    const noId = apply(complete, { type: "setIdentification", patch: { firstName: "" } });
    expect(getGuardRedirect(noId, routes.review, NOW)).toBe(routes.identification);
  });

  it("el pase exige haber enviado (simulado); si no, vuelve a la revisión", () => {
    expect(getGuardRedirect(complete, routes.pass, NOW)).toBe(routes.review);
    const sent = apply(complete, { type: "submit", episodeCode: "DEMO-0001-FICT" });
    expect(getGuardRedirect(sent, routes.pass, NOW)).toBeNull();
  });

  it("los datos de identificación (P06) llevan a la revisión y esta al pase", () => {
    expect(getNextRoute(complete, routes.identification)).toBe(routes.review);
    expect(getNextRoute(complete, routes.review)).toBe(routes.pass);
    expect(getPreviousRoute(complete, routes.review)).toBe(routes.identification);
    expect(getPreviousRoute(complete, routes.pass)).toBe(routes.review);
  });
});

describe("envío simulado", () => {
  it("submit registra el código de episodio", () => {
    const sent = apply(complete, { type: "submit", episodeCode: "DEMO-0001-FICT" });
    expect(sent.submission).toEqual({ status: "submitted", episodeCode: "DEMO-0001-FICT" });
  });

  it("cualquier cambio de datos invalida el envío; startEdit/finishEdit no", () => {
    const sent = apply(complete, { type: "submit", episodeCode: "DEMO-0001-FICT" });
    expect(apply(sent, { type: "startEdit" }).submission.status).toBe("submitted");
    expect(apply(sent, { type: "finishEdit" }).submission.status).toBe("submitted");
    expect(apply(sent, { type: "setComplaint", value: "otro texto" }).submission).toEqual({ status: "idle", episodeCode: null });
    expect(apply(sent, { type: "setIdentification", patch: { contact: "demo@example.com" } }).submission.status).toBe("idle");
    expect(apply(sent, { type: "setAnswer", id: "ab_scale", value: 2 }).submission.status).toBe("idle");
  });

  it("una acción que no cambia nada no invalida el envío", () => {
    const sent = apply(complete, { type: "submit", episodeCode: "DEMO-0001-FICT" });
    const selfNoOp = apply(sent, { type: "setRelationship", value: "minor" }); // 'para mí': se ignora
    expect(selfNoOp.submission.status).toBe("submitted");
  });

  it("reset vuelve a cero, incluido el envío", () => {
    expect(apply(apply(complete, { type: "submit", episodeCode: "X" }), { type: "reset" })).toEqual(initialFlowState);
  });

  it("el código de episodio es ficticio, de 4 dígitos y determinista", () => {
    expect(buildEpisodeCode(7)).toBe("DEMO-0007-FICT");
    expect(buildEpisodeCode(123456)).toBe("DEMO-3456-FICT");
    expect(buildEpisodeCode(-42)).toBe("DEMO-0042-FICT");
    expect(buildEpisodeCode(7.9)).toBe("DEMO-0007-FICT");
  });
});

describe("preguntas vistas (seen)", () => {
  it("markSeen es idempotente y no invalida un envío simulado", () => {
    const sent = apply(complete, { type: "submit", episodeCode: "DEMO-0001-FICT" });
    expect(apply(sent, { type: "markSeen", id: "ab_where" })).toBe(sent);
    expect(apply(sent, { type: "markSeen", id: "ab_vomit_note" }).submission.status).toBe("submitted");
  });

  it("cambiar de recorrido olvida lo visto; seguir en el mismo no", () => {
    expect(apply(complete, { type: "loadDemoComplaint", scenario: "abdominal", text: "otro texto" }).seen).toEqual(complete.seen);
    expect(apply(complete, { type: "loadDemoComplaint", scenario: "musculoskeletal", text: "otro" }).seen).toEqual({});
    expect(apply(complete, { type: "clearComplaint" }).seen).toEqual({});
  });

  it("descartar respuestas huérfanas también las olvida como vistas", () => {
    const withNote = apply(
      complete,
      { type: "setAnswer", id: "ab_vomit_note", value: "Dos veces" },
      { type: "markSeen", id: "ab_vomit_note" }
    );
    const pruned = apply(withNote, {
      type: "replaceAnswers",
      answers: complete.answers,
      removed: ["ab_vomit_note"],
    });
    expect(pruned.seen.ab_vomit_note).toBeUndefined();
    expect(pruned.seen.ab_where).toBe(true);
  });

  it("reset olvida todo", () => {
    expect(apply(complete, { type: "reset" }).seen).toEqual({});
  });
});

describe("identificación en el estado", () => {
  it("sin documento, el número se descarta", () => {
    const state = apply(complete, { type: "setIdentification", patch: { documentType: "none" } });
    expect(state.identification.documentNumber).toBe("");
  });

  it("hasProgress detecta datos de identificación", () => {
    expect(hasProgress(apply(initialFlowState, { type: "setIdentification", patch: { firstName: "A" } }))).toBe(true);
    expect(hasProgress(initialFlowState)).toBe(false);
  });
});

describe("buildReview", () => {
  const sections = (state: FlowState) => Object.fromEntries(buildReview(state).map((s) => [s.id, s]));

  it("incluye las cuatro secciones, cada una editable", () => {
    const review = buildReview(complete);
    expect(review.map((s) => s.id)).toEqual(["who", "complaint", "answers", "identification"]);
    expect(sections(complete).complaint.editRoute).toBe(routes.complaint);
    expect(sections(complete).identification.editRoute).toBe(routes.identification);
    for (const row of sections(complete).who.rows) expect(row.editRoute).toBeTruthy();
    for (const row of sections(complete).answers.rows) expect(row.editRoute).toBeTruthy();
  });

  it("muestra el motivo exactamente como se escribió", () => {
    const raw = "  me duele   la panza\n\ndesde ayer  ";
    const state = apply(complete, { type: "setComplaint", value: raw });
    expect(sections(state).complaint.rows[0].value).toBe(raw);
  });

  it("rotula el motivo cargado desde un ejemplo de demostración", () => {
    expect(sections(complete).complaint.note).toContain("Dolor de panza");
    expect(sections(apply(complete, { type: "clearComplaint" })).complaint.note).toBeUndefined();
  });

  it("las respuestas siguen el camino real y omiten la información contextual", () => {
    const ids = sections(complete).answers.rows.map((r) => r.id);
    expect(ids).toEqual(["ab_where", "ab_since", "ab_with", "ab_scale", "ab_confirm"]);
    expect(ids).not.toContain("ab_info");
  });

  it("una confirmación se rotula con lo que se confirmó", () => {
    const row = sections(complete).answers.rows.find((r) => r.id === "ab_confirm")!;
    expect(row.label).toBe("Estas respuestas reflejan lo que me pasa");
    expect(row.value).toBe("Confirmado");
    expect(row.label).not.toBe("Antes de seguir");
  });

  it("una pregunta opcional omitida se muestra como 'Omitida'", () => {
    const row = sections(complete).answers.rows.find((r) => r.id === "ab_with")!;
    expect(row.value).toBeNull();
    expect(row.emptyLabel).toBe("Omitida");
    expect(row.editRoute).toBe(questionRoute("ab_with"));
  });

  it("al cambiar la rama, las respuestas huérfanas dejan de aparecer", () => {
    const withVomit = apply(
      complete,
      { type: "setAnswer", id: "ab_with", value: ["vomit"] },
      { type: "setAnswer", id: "ab_vomit_note", value: "Dos veces" }
    );
    expect(sections(withVomit).answers.rows.map((r) => r.id)).toContain("ab_vomit_note");
    const without = apply(withVomit, { type: "setAnswer", id: "ab_with", value: ["nausea"] });
    // La respuesta guardada sigue en el estado hasta que se confirme el descarte, pero no está en el camino.
    expect(sections(without).answers.rows.map((r) => r.id)).not.toContain("ab_vomit_note");
  });

  it("muestra el vínculo solo si la consulta es para otra persona", () => {
    expect(sections(complete).who.rows.map((r) => r.id)).toEqual(["context"]);
    const other = apply(complete, { type: "setContext", value: "other" }, { type: "setRelationship", value: "minor" });
    expect(sections(other).who.rows.map((r) => r.id)).toEqual(["context", "relationship"]);
    expect(sections(other).who.rows[1].value).toBe("Menor a cargo");
    expect(sections(other).identification.title).toBe("Datos de la persona");
    expect(sections(complete).identification.title).toBe("Tus datos");
  });

  it("formatea los datos de identificación", () => {
    const rows = Object.fromEntries(sections(complete).identification.rows.map((r) => [r.id, r.value]));
    expect(rows).toEqual({
      name: "Persona De Prueba",
      document: "DNI 00000000",
      birth: "15/06/1990",
      contact: null,
    });
    const none = apply(complete, { type: "setIdentification", patch: { documentType: "none" } });
    expect(sections(none).identification.rows.find((r) => r.id === "document")!.value).toBe("No tengo documento a mano");
  });
});

describe("getBirthDateNotice (aviso no bloqueante)", () => {
  const other = (relationship: "minor" | "accompanied_adult", birthYear: string) =>
    apply(
      complete,
      { type: "setContext", value: "other" },
      { type: "setRelationship", value: relationship },
      { type: "setIdentification", patch: { birthYear } }
    );

  it("avisa si dijo 'menor' pero la fecha es de un adulto", () => {
    expect(getBirthDateNotice(other("minor", "1990"), NOW)).toContain("persona adulta");
  });

  it("avisa si dijo 'adulto acompañado' pero la fecha es de un menor", () => {
    expect(getBirthDateNotice(other("accompanied_adult", "2018"), NOW)).toContain("menor de edad");
  });

  it("no avisa cuando condice, ni para uno mismo, ni sin fecha válida", () => {
    expect(getBirthDateNotice(other("minor", "2018"), NOW)).toBeNull();
    expect(getBirthDateNotice(other("accompanied_adult", "1990"), NOW)).toBeNull();
    expect(getBirthDateNotice(complete, NOW)).toBeNull();
    expect(getBirthDateNotice(apply(other("minor", "1990"), { type: "setIdentification", patch: { birthYear: "" } }), NOW)).toBeNull();
  });
});
