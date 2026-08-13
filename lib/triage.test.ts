import { describe, expect, it } from "vitest";
import {
  analyzeTriage,
  getPriorityLabel,
  getRecommendation,
  getSourceLabel,
  normalizeSource,
  priorityRank,
} from "./triage";

describe("analyzeTriage — priority classification", () => {
  it("defaults to VERDE with no red flags, no intensity, no warning keywords", () => {
    const result = analyzeTriage({ motivo: "me duele un poco la cabeza" });
    expect(result.priority).toBe("VERDE");
  });

  it("escalates to ROJO when a red flag is submitted, regardless of everything else", () => {
    const result = analyzeTriage({
      motivo: "dolor de cabeza leve",
      redFlags: ["peor dolor de cabeza de mi vida, de golpe"],
    });
    expect(result.priority).toBe("ROJO");
  });

  it("detects a red-signal keyword directly in the free-text motivo", () => {
    const result = analyzeTriage({ motivo: "tengo dolor de pecho intenso" });
    expect(result.priority).toBe("ROJO");
    expect(result.redSignals).toContain("dolor de pecho");
  });

  it("escalates to AMARILLO when intensidad >= 7", () => {
    const result = analyzeTriage({ motivo: "dolor abdominal", intensidad: 7 });
    expect(result.priority).toBe("AMARILLO");
  });

  it("stays VERDE when intensidad is below 7", () => {
    const result = analyzeTriage({ motivo: "dolor abdominal", intensidad: 6 });
    expect(result.priority).toBe("VERDE");
  });

  it("escalates to AMARILLO on a warning keyword (e.g. fiebre) even without intensidad", () => {
    const result = analyzeTriage({ motivo: "tengo fiebre alta" });
    expect(result.priority).toBe("AMARILLO");
  });

  it("escalates to AMARILLO via urgentSignals (photo/non-keyword judgment calls)", () => {
    // Regression test: a wound assessed from a photo used to fall through to
    // VERDE because nothing in the text matched a fixed keyword or
    // intensidad >= 7 — urgentSignals is the fix, added 2026-08-11.
    const result = analyzeTriage({
      motivo: "herida abierta en la rodilla, bordes separados, segun foto",
      sintomas: ["herida abierta con bordes separados"],
      urgentSignals: [
        "herida abierta con bordes separados requiere evaluacion presencial",
      ],
    });
    expect(result.priority).toBe("AMARILLO");
    expect(result.handover.senalesUrgentes).toEqual([
      "herida abierta con bordes separados requiere evaluacion presencial",
    ]);
  });

  it("does NOT escalate on urgentSignals alone to ROJO — only AMARILLO", () => {
    const result = analyzeTriage({
      motivo: "consulta de rutina",
      urgentSignals: ["algo urgente pero no una emergencia"],
    });
    expect(result.priority).toBe("AMARILLO");
  });

  it("ROJO (redFlags) wins over AMARILLO-level signals when both are present", () => {
    const result = analyzeTriage({
      motivo: "dolor de pecho intenso y tambien fiebre",
      redFlags: ["dolor de pecho intenso"],
      intensidad: 8,
    });
    expect(result.priority).toBe("ROJO");
  });
});

describe("analyzeTriage — negation handling (regression, 2026-08-11)", () => {
  // Before the fix, plain substring matching found "fiebre" inside "sin
  // fiebre" and "dolor fuerte" inside "sin dolor fuerte", incorrectly
  // escalating a patient who explicitly denied those symptoms.
  it("does not escalate on a warning keyword that is explicitly negated", () => {
    const result = analyzeTriage({
      motivo: "Me siento muy descompuesto y con ganas de vomitar",
      sintomas: ["solo nauseas", "sin vomitos", "sin fiebre", "sin dolor fuerte"],
    });
    expect(result.priority).toBe("VERDE");
  });

  it("does not raise a false ROJO from a negated red-signal phrase", () => {
    const result = analyzeTriage({
      motivo: "no tengo dolor de pecho ni dificultad para respirar",
    });
    expect(result.priority).not.toBe("ROJO");
    expect(result.redSignals).toEqual([]);
  });

  it("still escalates when the same keyword appears unnegated in a later clause", () => {
    const result = analyzeTriage({
      motivo: "sin dolor de pecho, pero con fiebre alta desde ayer",
    });
    expect(result.priority).toBe("AMARILLO");
  });

  it("handles negation with 'no' the same way as 'sin'", () => {
    const result = analyzeTriage({
      motivo: "no tengo fiebre ni mareos",
    });
    expect(result.priority).toBe("VERDE");
  });

  it("a genuine (non-negated) red flag still fires normally", () => {
    const result = analyzeTriage({ motivo: "tengo mucho dolor de pecho" });
    expect(result.priority).toBe("ROJO");
  });
});

describe("analyzeTriage — patient label / nombre", () => {
  it("uses the provided nombre as patientLabel", () => {
    const result = analyzeTriage({ motivo: "dolor de garganta", nombre: "Rocío" });
    expect(result.patientLabel).toBe("Rocío");
  });

  it("falls back to a generic label when no nombre is given", () => {
    const result = analyzeTriage({ motivo: "dolor de garganta" });
    expect(result.patientLabel).toBe("Paciente sin identificar");
  });

  it("trims whitespace-only nombre down to the fallback label", () => {
    const result = analyzeTriage({ motivo: "dolor de garganta", nombre: "   " });
    expect(result.patientLabel).toBe("Paciente sin identificar");
  });
});

describe("analyzeTriage — obraSocial", () => {
  it("stores a trimmed obraSocial in the handover", () => {
    const result = analyzeTriage({ motivo: "control", obraSocial: "  OSDE  " });
    expect(result.handover.obraSocial).toBe("OSDE");
  });

  it("omits obraSocial from the handover when not provided", () => {
    const result = analyzeTriage({ motivo: "control" });
    expect(result.handover.obraSocial).toBeUndefined();
  });
});

describe("analyzeTriage — source", () => {
  it("normalizes an unknown/missing source to web", () => {
    const result = analyzeTriage({ motivo: "control" });
    expect(result.source).toBe("web");
  });

  it("keeps a valid source as-is", () => {
    const result = analyzeTriage({ motivo: "control", source: "whatsapp" });
    expect(result.source).toBe("whatsapp");
    expect(result.sourceLabel).toBe(getSourceLabel("whatsapp"));
  });
});

describe("normalizeSource", () => {
  it("passes through valid sources", () => {
    expect(normalizeSource("web")).toBe("web");
    expect(normalizeSource("qr")).toBe("qr");
    expect(normalizeSource("whatsapp")).toBe("whatsapp");
  });

  it("defaults anything else to web", () => {
    expect(normalizeSource("carrier-pigeon")).toBe("web");
    expect(normalizeSource(undefined)).toBe("web");
    expect(normalizeSource(null)).toBe("web");
  });
});

describe("getPriorityLabel / getRecommendation / priorityRank", () => {
  it("has a label and recommendation for every priority", () => {
    const priorities = ["ROJO", "NARANJA", "AMARILLO", "VERDE", "AZUL"] as const;
    for (const priority of priorities) {
      expect(getPriorityLabel(priority)).toBeTruthy();
      expect(getRecommendation(priority)).toBeTruthy();
    }
  });

  it("ranks ROJO as most urgent and AZUL as least", () => {
    expect(priorityRank("ROJO")).toBeLessThan(priorityRank("NARANJA"));
    expect(priorityRank("NARANJA")).toBeLessThan(priorityRank("AMARILLO"));
    expect(priorityRank("AMARILLO")).toBeLessThan(priorityRank("VERDE"));
    expect(priorityRank("VERDE")).toBeLessThan(priorityRank("AZUL"));
  });
});
