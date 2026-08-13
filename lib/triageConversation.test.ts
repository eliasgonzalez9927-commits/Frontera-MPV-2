import { describe, expect, it } from "vitest";
import {
  entryModeLabels,
  evolutionOptions,
  getEntryModeLabel,
  getEstimatedPriority,
  getEstimatedPriorityReason,
  getOrientationMessage,
  getPositiveRedFlags,
  isUsefulChiefComplaint,
  normalizeEntryMode,
  redFlagQuestions,
  type RedFlagAnswer,
} from "./triageConversation";

describe("normalizeEntryMode", () => {
  it("always returns clinic_qr when hasClinic is true, regardless of the submitted value", () => {
    expect(normalizeEntryMode("needs_orientation", true)).toBe("clinic_qr");
    expect(normalizeEntryMode(undefined, true)).toBe("clinic_qr");
    expect(normalizeEntryMode("garbage", true)).toBe("clinic_qr");
  });

  it("passes through needs_orientation and onsite_unknown when there's no clinic", () => {
    expect(normalizeEntryMode("needs_orientation", false)).toBe("needs_orientation");
    expect(normalizeEntryMode("onsite_unknown", false)).toBe("onsite_unknown");
  });

  it("defaults to onsite_unknown for anything unrecognized with no clinic", () => {
    expect(normalizeEntryMode("clinic_qr", false)).toBe("onsite_unknown");
    expect(normalizeEntryMode(undefined, false)).toBe("onsite_unknown");
    expect(normalizeEntryMode(123, false)).toBe("onsite_unknown");
  });
});

describe("getEntryModeLabel", () => {
  it("returns the matching label for each valid entry mode", () => {
    expect(getEntryModeLabel("clinic_qr")).toBe(entryModeLabels.clinic_qr);
    expect(getEntryModeLabel("onsite_unknown")).toBe(entryModeLabels.onsite_unknown);
    expect(getEntryModeLabel("needs_orientation")).toBe(
      entryModeLabels.needs_orientation
    );
  });

  it("returns undefined for unrecognized or missing values", () => {
    expect(getEntryModeLabel("something-else")).toBeUndefined();
    expect(getEntryModeLabel(undefined)).toBeUndefined();
    expect(getEntryModeLabel("")).toBeUndefined();
  });
});

describe("getOrientationMessage", () => {
  it("gives the emergency message for ROJO", () => {
    expect(getOrientationMessage("ROJO")).toMatch(/atención inmediata/i);
  });

  it("gives the same 'see someone today' message for AMARILLO and NARANJA", () => {
    expect(getOrientationMessage("AMARILLO")).toBe(getOrientationMessage("NARANJA"));
    expect(getOrientationMessage("AMARILLO")).toMatch(/hoy/i);
  });

  it("gives the low-urgency message for VERDE and AZUL", () => {
    expect(getOrientationMessage("VERDE")).toBe(getOrientationMessage("AZUL"));
    expect(getOrientationMessage("VERDE")).toMatch(/no prioritaria/i);
  });
});

describe("isUsefulChiefComplaint", () => {
  it("rejects anything shorter than 10 letters/numbers", () => {
    expect(isUsefulChiefComplaint("duele")).toBe(false);
    expect(isUsefulChiefComplaint("")).toBe(false);
    expect(isUsefulChiefComplaint("dolor de")).toBe(false); // "dolorde" = 7 chars
  });

  it("rejects known placeholder/junk inputs", () => {
    for (const junk of ["test", "testing", "prueba", "asdf", "asdasdasd", "xxxxx"]) {
      expect(isUsefulChiefComplaint(junk)).toBe(false);
    }
  });

  it("rejects low-variety strings even if long enough (e.g. all the same character)", () => {
    expect(isUsefulChiefComplaint("aaaaaaaaaaaaaaaa")).toBe(false);
  });

  it("rejects an obviously repeated short pattern even with enough unique characters", () => {
    // "abcd" (4 distinct chars, so it passes the unique-character check) repeated
    // 3 times is still not a real description.
    expect(isUsefulChiefComplaint("abcd abcd abcd")).toBe(false);
  });

  it("accepts a normal multi-word description", () => {
    expect(isUsefulChiefComplaint("me duele mucho el estomago desde ayer")).toBe(true);
  });

  it("accepts a single long word (>=18 chars) even without a second word", () => {
    const singleWord = "dolorabdominalfuerte"; // 20 chars, no spaces
    expect(singleWord.length).toBeGreaterThanOrEqual(18);
    expect(isUsefulChiefComplaint(singleWord)).toBe(true);
  });

  it("rejects a single short word even if it clears the 10-character minimum", () => {
    const singleShortWord = "descompuesto"; // 12 chars, one word, < 18
    expect(isUsefulChiefComplaint(singleShortWord)).toBe(false);
  });

  it("is accent- and case-insensitive, and doesn't choke on ñ", () => {
    expect(isUsefulChiefComplaint("Dolor de Cabeza Fuerte")).toBe(true);
    expect(isUsefulChiefComplaint("me duele la garganta hace años")).toBe(true);
  });

  it("accepts descriptions containing numbers (e.g. a fever reading)", () => {
    expect(isUsefulChiefComplaint("tengo 39 de fiebre desde ayer")).toBe(true);
  });
});

describe("getPositiveRedFlags", () => {
  function answer(overrides: Partial<RedFlagAnswer>): RedFlagAnswer {
    return {
      id: "id",
      question: "question",
      answer: "no",
      signal: "signal",
      ...overrides,
    };
  }

  it("returns the signal for every 'yes' answer, in order", () => {
    const answers = [
      answer({ answer: "no", signal: "dolor de pecho" }),
      answer({ answer: "yes", signal: "sangrado abundante" }),
      answer({ answer: "yes", signal: "convulsión" }),
      answer({ answer: "unsure", signal: "debilidad en un lado" }),
    ];

    expect(getPositiveRedFlags(answers)).toEqual([
      "sangrado abundante",
      "convulsión",
    ]);
  });

  it("returns an empty array when there are no 'yes' answers", () => {
    const answers = [
      answer({ answer: "no" }),
      answer({ answer: "unsure" }),
    ];
    expect(getPositiveRedFlags(answers)).toEqual([]);
  });

  it("returns an empty array for an empty input", () => {
    expect(getPositiveRedFlags([])).toEqual([]);
  });
});

describe("getEstimatedPriority", () => {
  function answer(answerValue: RedFlagAnswer["answer"]): RedFlagAnswer {
    return { id: "id", question: "q", answer: answerValue, signal: "signal" };
  }

  it("returns ROJO whenever there's at least one positive red flag, regardless of intensity", () => {
    expect(getEstimatedPriority(1, [answer("yes")])).toBe("ROJO");
    expect(getEstimatedPriority(10, [answer("yes")])).toBe("ROJO");
  });

  it("returns AMARILLO when intensity >= 7 and no red flags", () => {
    expect(getEstimatedPriority(7, [answer("no")])).toBe("AMARILLO");
    expect(getEstimatedPriority(10, [])).toBe("AMARILLO");
  });

  it("returns VERDE when intensity < 7 and no red flags", () => {
    expect(getEstimatedPriority(6, [answer("no"), answer("unsure")])).toBe("VERDE");
    expect(getEstimatedPriority(0, [])).toBe("VERDE");
  });
});

describe("getEstimatedPriorityReason", () => {
  it("explains ROJO via red flags", () => {
    expect(getEstimatedPriorityReason("ROJO", 1)).toMatch(/señal roja/i);
  });

  it("explains a non-ROJO high intensity", () => {
    expect(getEstimatedPriorityReason("AMARILLO", 8)).toMatch(/intensidad informada es alta/i);
  });

  it("explains a non-ROJO low/moderate intensity with no red flags", () => {
    expect(getEstimatedPriorityReason("VERDE", 3)).toMatch(/leve o moderada/i);
  });
});

describe("static data sanity checks", () => {
  it("every red flag question has a non-empty id, question, and signal", () => {
    for (const item of redFlagQuestions) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.question.length).toBeGreaterThan(0);
      expect(item.signal.length).toBeGreaterThan(0);
    }
  });

  it("red flag question ids are unique", () => {
    const ids = redFlagQuestions.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("evolutionOptions is a non-empty list of non-empty strings", () => {
    expect(evolutionOptions.length).toBeGreaterThan(0);
    for (const option of evolutionOptions) {
      expect(option.length).toBeGreaterThan(0);
    }
  });
});
