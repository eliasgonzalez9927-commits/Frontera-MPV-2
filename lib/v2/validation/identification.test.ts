import { describe, expect, it } from "vitest";
import { buildDemoIdentification } from "../fixtures/demoIdentity";
import {
  emptyIdentification,
  formatBirthDate,
  getAgeYears,
  isIdentificationValid,
  normalizeDocumentNumber,
  parseBirthDate,
  validateBirthDate,
  validateContact,
  validateDocument,
  validateIdentification,
  validateName,
  type Identification,
} from "./identification";

const NOW = new Date(2026, 5, 15); // 15/06/2026

const valid: Identification = {
  firstName: "Persona",
  lastName: "De Prueba",
  documentType: "dni",
  documentNumber: "00000000",
  birthDay: "15",
  birthMonth: "6",
  birthYear: "1990",
  contact: "",
};

describe("validateName", () => {
  it("acepta nombres con acentos, ñ, guiones, apóstrofes y de otros alfabetos", () => {
    for (const name of ["José María", "Núñez", "O'Connor", "Ana-Lucía", "Zoë", "李明", "Müller", "D’Angelo", "Jr."]) {
      expect(validateName(name, "nombre"), name).toBeNull();
    }
  });

  it("rechaza vacío, solo espacios y números", () => {
    expect(validateName("", "nombre")).toContain("Escribí tu nombre");
    expect(validateName("   ", "apellido")).toContain("Escribí el apellido");
    expect(validateName("Ana2", "nombre")).toContain("solo puede tener letras");
    expect(validateName("123", "apellido")).toContain("solo puede tener letras");
  });

  it("limita el largo", () => {
    expect(validateName("a".repeat(81), "nombre")).toContain("80");
    expect(validateName("a".repeat(80), "nombre")).toBeNull();
  });

  it("no acepta que empiece con símbolo", () => {
    expect(validateName("-Ana", "nombre")).not.toBeNull();
  });
});

describe("validateDocument", () => {
  it("exige elegir tipo", () => {
    expect(validateDocument("", "")).toContain("Elegí un tipo de documento");
  });

  it("'no tengo documento' no pide número", () => {
    expect(validateDocument("none", "")).toBeNull();
    expect(validateDocument("none", "lo que sea")).toBeNull();
  });

  it("DNI: 7 u 8 números, con o sin puntos", () => {
    expect(validateDocument("dni", "12.345.678")).toBeNull();
    expect(validateDocument("dni", "1234567")).toBeNull();
    expect(validateDocument("dni", "12 345 678")).toBeNull();
    expect(validateDocument("dni", "123456")).toContain("7 u 8 números");
    expect(validateDocument("dni", "123456789")).toContain("7 u 8 números");
    expect(validateDocument("dni", "1234567A")).toContain("7 u 8 números");
  });

  it("pasaporte: 6 a 12 letras o números", () => {
    expect(validateDocument("passport", "AB123456")).toBeNull();
    expect(validateDocument("passport", "AB 123-456")).toBeNull();
    expect(validateDocument("passport", "AB12")).toContain("6 y 12");
    expect(validateDocument("passport", "A".repeat(13))).toContain("6 y 12");
  });

  it("documento extranjero: 4 a 20 letras o números", () => {
    expect(validateDocument("foreign_id", "X-1234-Y")).toBeNull();
    expect(validateDocument("foreign_id", "AB1")).toContain("4 y 20");
    expect(validateDocument("foreign_id", "A".repeat(21))).toContain("4 y 20");
  });

  it("número vacío con un tipo elegido pide el número", () => {
    expect(validateDocument("dni", "  ")).toContain("Escribí el número");
    expect(validateDocument("passport", "")).toContain("Escribí el número");
  });

  it("normalizeDocumentNumber quita separadores", () => {
    expect(normalizeDocumentNumber("12.345 678-9/0")).toBe("1234567890");
  });
});

describe("fechas de nacimiento", () => {
  it("acepta una fecha válida, con o sin ceros", () => {
    expect(validateBirthDate("15", "06", "1990", NOW)).toBeNull();
    expect(validateBirthDate("5", "6", "1990", NOW)).toBeNull();
  });

  it("acepta hoy y años bisiestos", () => {
    expect(validateBirthDate("15", "6", "2026", NOW)).toBeNull();
    expect(validateBirthDate("29", "2", "2000", NOW)).toBeNull();
  });

  it("explica cada tipo de error", () => {
    expect(validateBirthDate("", "", "", NOW)).toContain("Ingresá la fecha");
    expect(validateBirthDate("15", "", "1990", NOW)).toContain("Completá día, mes y año");
    expect(validateBirthDate("1a", "6", "1990", NOW)).toContain("solo números");
    expect(validateBirthDate("15", "6", "90", NOW)).toContain("4 cifras");
    expect(validateBirthDate("31", "2", "2000", NOW)).toContain("no existe");
    expect(validateBirthDate("29", "2", "2001", NOW)).toContain("no existe");
    expect(validateBirthDate("0", "6", "1990", NOW)).toContain("no existe");
    expect(validateBirthDate("15", "13", "1990", NOW)).toContain("no existe");
  });

  it("rechaza fechas futuras (incluido mañana) y demasiado antiguas", () => {
    expect(validateBirthDate("16", "6", "2026", NOW)).toContain("futura");
    expect(validateBirthDate("1", "1", "2030", NOW)).toContain("futura");
    expect(validateBirthDate("1", "1", "1900", NOW)).toContain("demasiado lejano");
    expect(validateBirthDate("1", "1", "1906", NOW)).toBeNull();
  });

  it("parseBirthDate devuelve null para fechas inexistentes", () => {
    expect(parseBirthDate("15", "6", "1990")).toEqual({ year: 1990, month: 6, day: 15 });
    expect(parseBirthDate("31", "4", "1990")).toBeNull();
    expect(parseBirthDate("1", "1", "99")).toBeNull();
  });

  it("calcula la edad cumplida respecto del día de hoy", () => {
    expect(getAgeYears("15", "6", "2008", NOW)).toBe(18); // cumple hoy
    expect(getAgeYears("16", "6", "2008", NOW)).toBe(17); // cumple mañana
    expect(getAgeYears("14", "6", "2008", NOW)).toBe(18);
    expect(getAgeYears("15", "6", "2026", NOW)).toBe(0);
    expect(getAgeYears("16", "6", "2026", NOW)).toBeNull(); // futura
    expect(getAgeYears("31", "2", "2000", NOW)).toBeNull(); // inexistente
  });

  it("formatBirthDate completa con ceros", () => {
    expect(formatBirthDate({ birthDay: "5", birthMonth: "6", birthYear: "1990" })).toBe("05/06/1990");
    expect(formatBirthDate({ birthDay: "", birthMonth: "", birthYear: "" })).toBeNull();
  });
});

describe("validateContact", () => {
  it("es opcional", () => {
    expect(validateContact("")).toBeNull();
    expect(validateContact("   ")).toBeNull();
  });

  it("acepta email y teléfonos con formato habitual", () => {
    for (const contact of ["demo@example.com", "+54 9 261 555-1234", "(0261) 555 1234", "2615551234"]) {
      expect(validateContact(contact), contact).toBeNull();
    }
  });

  it("rechaza lo que no es ni email ni teléfono", () => {
    expect(validateContact("hola")).toContain("email o un teléfono");
    expect(validateContact("12345")).toContain("email o un teléfono");
    expect(validateContact("demo@")).toContain("email o un teléfono");
    expect(validateContact("a@b")).toContain("email o un teléfono");
  });

  it("limita el largo", () => {
    expect(validateContact(`${"a".repeat(95)}@x.com`)).toContain("100");
  });
});

describe("validateIdentification", () => {
  it("un formulario válido no tiene errores", () => {
    expect(validateIdentification(valid, NOW)).toEqual({});
    expect(isIdentificationValid(valid, NOW)).toBe(true);
  });

  it("el formulario vacío marca todos los obligatorios y no el contacto", () => {
    const errors = validateIdentification(emptyIdentification, NOW);
    expect(Object.keys(errors).sort()).toEqual(["birthDate", "documentType", "firstName", "lastName"]);
  });

  it("sin documento no pide número", () => {
    expect(validateIdentification({ ...valid, documentType: "none", documentNumber: "" }, NOW)).toEqual({});
  });

  it("con tipo elegido pero sin número, marca solo el número", () => {
    const errors = validateIdentification({ ...valid, documentNumber: "" }, NOW);
    expect(Object.keys(errors)).toEqual(["documentNumber"]);
  });

  it("un contacto inválido bloquea aunque sea opcional", () => {
    expect(Object.keys(validateIdentification({ ...valid, contact: "hola" }, NOW))).toEqual(["contact"]);
  });
});

describe("datos de ejemplo", () => {
  it("siempre pasan la validación", () => {
    for (const relationship of [null, "minor", "accompanied_adult", "cannot_respond"] as const) {
      expect(isIdentificationValid(buildDemoIdentification(relationship, NOW), NOW), String(relationship)).toBe(true);
    }
  });

  it("son inequívocamente ficticios y usan un dominio reservado", () => {
    const demo = buildDemoIdentification(null, NOW);
    expect(demo.lastName).toBe("De Prueba");
    expect(demo.documentNumber).toBe("00000000");
    expect(demo.contact.endsWith("@example.com")).toBe(true);
  });

  it("para un menor a cargo generan una fecha de menor de edad", () => {
    const demo = buildDemoIdentification("minor", NOW);
    expect(getAgeYears(demo.birthDay, demo.birthMonth, demo.birthYear, NOW)).toBeLessThan(18);
  });
});
