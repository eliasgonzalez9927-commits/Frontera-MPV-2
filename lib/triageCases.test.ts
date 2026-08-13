import { describe, expect, it } from "vitest";
import {
  allowedStatuses,
  formatCaseDate,
  formatCaseTime,
  getCaseOriginLabel,
  mapRowToTriageCase,
  prioritySortValue,
  sortTriageCases,
  statusLabels,
  statusSortValue,
  type CaseStatus,
  type TriageCase,
  type TriageCaseRow,
} from "./triageCases";
import type { Priority } from "./triage";

function makeRow(overrides: Partial<TriageCaseRow> = {}): TriageCaseRow {
  return {
    id: "row-1",
    case_code: "FR-ABC123",
    source: "whatsapp",
    source_label: "Entrada WhatsApp",
    patient_label: "Rocío",
    chief_complaint: "dolor de cabeza fuerte",
    evolution: "1 hora",
    intensity: 6,
    symptoms: ["sin fiebre"],
    red_signals: [],
    priority: "VERDE",
    priority_label: "Poco urgente",
    recommendation: "Podría resolverse con atención no prioritaria.",
    handover: {
      motivo: "dolor de cabeza fuerte",
      prioridad: "VERDE",
      senalesDetectadas: [],
      sintomasAdicionales: ["sin fiebre"],
    },
    status: "waiting",
    created_at: "2026-08-11T22:44:37.166Z",
    clinic_id: "c1",
    clinic_slug: "clinica-demo",
    clinics: { name: "Clinica Demo", slug: "clinica-demo" },
    ...overrides,
  };
}

function makeCase(overrides: Partial<TriageCase> = {}): TriageCase {
  return {
    id: "FR-1",
    caseCode: "FR-1",
    patientLabel: "Paciente sin identificar",
    source: "web",
    sourceLabel: "Entrada web",
    priority: "VERDE",
    title: "Poco urgente",
    recommendation: "",
    redSignals: [],
    handover: { motivo: "control", prioridad: "VERDE", senalesDetectadas: [], sintomasAdicionales: [] },
    createdAt: "2026-08-11T10:00:00.000Z",
    status: "waiting",
    chiefComplaint: "control",
    symptoms: [],
    ...overrides,
  };
}

describe("mapRowToTriageCase", () => {
  it("maps every field from the DB row shape to the app shape", () => {
    const result = mapRowToTriageCase(makeRow());

    expect(result).toMatchObject({
      id: "FR-ABC123",
      caseCode: "FR-ABC123",
      patientLabel: "Rocío",
      source: "whatsapp",
      sourceLabel: "Entrada WhatsApp",
      priority: "VERDE",
      title: "Poco urgente",
      recommendation: "Podría resolverse con atención no prioritaria.",
      redSignals: [],
      status: "waiting",
      chiefComplaint: "dolor de cabeza fuerte",
      evolution: "1 hora",
      intensity: 6,
      symptoms: ["sin fiebre"],
      clinicId: "c1",
      clinicSlug: "clinica-demo",
      clinicName: "Clinica Demo",
    });
  });

  it("converts null evolution/intensity to undefined", () => {
    const result = mapRowToTriageCase(makeRow({ evolution: null, intensity: null }));
    expect(result.evolution).toBeUndefined();
    expect(result.intensity).toBeUndefined();
  });

  it("converts null clinic fields to undefined and drops clinicName when no clinics join", () => {
    const result = mapRowToTriageCase(
      makeRow({ clinic_id: null, clinic_slug: null, clinics: null })
    );
    expect(result.clinicId).toBeUndefined();
    expect(result.clinicSlug).toBeUndefined();
    expect(result.clinicName).toBeUndefined();
  });
});

describe("prioritySortValue", () => {
  it("ranks ROJO first and AZUL last", () => {
    expect(prioritySortValue("ROJO")).toBeLessThan(prioritySortValue("NARANJA"));
    expect(prioritySortValue("NARANJA")).toBeLessThan(prioritySortValue("AMARILLO"));
    expect(prioritySortValue("AMARILLO")).toBeLessThan(prioritySortValue("VERDE"));
    expect(prioritySortValue("VERDE")).toBeLessThan(prioritySortValue("AZUL"));
  });
});

describe("statusSortValue", () => {
  it("ranks waiting before in_review before attended", () => {
    expect(statusSortValue("waiting")).toBeLessThan(statusSortValue("in_review"));
    expect(statusSortValue("in_review")).toBeLessThan(statusSortValue("attended"));
  });
});

describe("sortTriageCases", () => {
  it("sorts by status first, regardless of priority", () => {
    const waitingVerde = makeCase({ id: "a", status: "waiting", priority: "VERDE" });
    const attendedRojo = makeCase({ id: "b", status: "attended", priority: "ROJO" });

    const sorted = sortTriageCases([attendedRojo, waitingVerde]);
    expect(sorted.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("within the same status, sorts by priority (ROJO first)", () => {
    const verde = makeCase({ id: "a", status: "waiting", priority: "VERDE" });
    const rojo = makeCase({ id: "b", status: "waiting", priority: "ROJO" });
    const amarillo = makeCase({ id: "c", status: "waiting", priority: "AMARILLO" });

    const sorted = sortTriageCases([verde, rojo, amarillo]);
    expect(sorted.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("within the same status and priority, sorts newest first", () => {
    const older = makeCase({
      id: "a",
      status: "waiting",
      priority: "AMARILLO",
      createdAt: "2026-08-11T10:00:00.000Z",
    });
    const newer = makeCase({
      id: "b",
      status: "waiting",
      priority: "AMARILLO",
      createdAt: "2026-08-11T12:00:00.000Z",
    });

    const sorted = sortTriageCases([older, newer]);
    expect(sorted.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the input array", () => {
    const cases = [
      makeCase({ id: "a", status: "attended" }),
      makeCase({ id: "b", status: "waiting" }),
    ];
    const original = [...cases];

    sortTriageCases(cases);
    expect(cases).toEqual(original);
  });

  it("produces a stable full ordering across mixed status and priority", () => {
    const cases = [
      makeCase({ id: "attended-rojo", status: "attended", priority: "ROJO" }),
      makeCase({ id: "waiting-verde", status: "waiting", priority: "VERDE" }),
      makeCase({ id: "waiting-rojo", status: "waiting", priority: "ROJO" }),
      makeCase({ id: "in_review-amarillo", status: "in_review", priority: "AMARILLO" }),
    ];

    const sorted = sortTriageCases(cases);
    expect(sorted.map((c) => c.id)).toEqual([
      "waiting-rojo",
      "waiting-verde",
      "in_review-amarillo",
      "attended-rojo",
    ]);
  });
});

describe("formatCaseDate / formatCaseTime", () => {
  it("formats a date as DD/MM/YYYY · HH:MM hs", () => {
    const value = new Date(2026, 7, 11, 9, 5).toISOString(); // Aug 11 2026, 09:05 local
    expect(formatCaseDate(value)).toMatch(/^11\/08\/2026 · 09:05 hs$/);
  });

  it("pads single-digit day/month/hour/minute with a leading zero", () => {
    const value = new Date(2026, 0, 5, 3, 9).toISOString(); // Jan 5 2026, 03:09 local
    expect(formatCaseDate(value)).toBe("05/01/2026 · 03:09 hs");
  });

  it("formatCaseTime returns just the HH:MM hs portion", () => {
    const value = new Date(2026, 7, 11, 19, 32).toISOString();
    expect(formatCaseTime(value)).toBe("19:32 hs");
  });
});

describe("getCaseOriginLabel", () => {
  it("prefers the entry-mode label when entryMode is set", () => {
    const label = getCaseOriginLabel({
      sourceLabel: "Entrada WhatsApp",
      handover: {
        motivo: "x",
        prioridad: "VERDE" as Priority,
        senalesDetectadas: [],
        sintomasAdicionales: [],
        entryMode: "clinic_qr",
      },
    });
    expect(label).toBe("Entrada QR de guardia");
  });

  it("falls back to sourceLabel when entryMode is missing", () => {
    const label = getCaseOriginLabel({
      sourceLabel: "Entrada web",
      handover: {
        motivo: "x",
        prioridad: "VERDE" as Priority,
        senalesDetectadas: [],
        sintomasAdicionales: [],
      },
    });
    expect(label).toBe("Entrada web");
  });

  it("falls back to sourceLabel when entryMode is an unrecognized value", () => {
    const label = getCaseOriginLabel({
      sourceLabel: "Entrada web",
      handover: {
        motivo: "x",
        prioridad: "VERDE" as Priority,
        senalesDetectadas: [],
        sintomasAdicionales: [],
        entryMode: "something-unexpected",
      },
    });
    expect(label).toBe("Entrada web");
  });
});

describe("allowedStatuses / statusLabels", () => {
  it("has a label for every allowed status", () => {
    for (const status of allowedStatuses) {
      expect(statusLabels[status as CaseStatus]).toBeTruthy();
    }
  });

  it("lists exactly waiting, in_review, attended", () => {
    expect(allowedStatuses).toEqual(["waiting", "in_review", "attended"]);
  });
});
