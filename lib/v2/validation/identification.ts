// Validación de interfaz de los datos de identificación (P06). Solo comprueba forma y rango:
// no consulta ningún registro ni verifica que la persona exista.

export type DocumentType = "dni" | "passport" | "foreign_id" | "none";

export type Identification = {
  firstName: string;
  lastName: string;
  documentType: DocumentType | "";
  documentNumber: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  contact: string;
};

export const emptyIdentification: Identification = {
  firstName: "",
  lastName: "",
  documentType: "",
  documentNumber: "",
  birthDay: "",
  birthMonth: "",
  birthYear: "",
  contact: "",
};

export const documentTypeLabels: Record<DocumentType, string> = {
  dni: "DNI",
  passport: "Pasaporte",
  foreign_id: "Otro documento (de otro país)",
  none: "No tengo documento a mano",
};

export type IdentificationField =
  | "firstName"
  | "lastName"
  | "documentType"
  | "documentNumber"
  | "birthDate"
  | "contact";

export type IdentificationErrors = Partial<Record<IdentificationField, string>>;

export const NAME_MAX_LENGTH = 80;
export const CONTACT_MAX_LENGTH = 100;
export const MAX_AGE_YEARS = 120;

// Letras de cualquier idioma, espacios, apóstrofes, guiones y puntos (nombres compuestos,
// con acentos o de otros alfabetos). No se admiten números.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.\-]*$/u;

export function validateName(value: string, label: "nombre" | "apellido"): string | null {
  const text = value.trim();
  if (text.length === 0) {
    return label === "nombre" ? "Escribí tu nombre." : "Escribí el apellido.";
  }
  if (text.length > NAME_MAX_LENGTH) return `Usá hasta ${NAME_MAX_LENGTH} caracteres.`;
  if (!NAME_PATTERN.test(text)) {
    return `El ${label} solo puede tener letras, espacios, guiones y apóstrofes.`;
  }
  return null;
}

/** Quita separadores habituales para comparar el número de documento. */
export function normalizeDocumentNumber(value: string) {
  return value.replace(/[\s.\-/]/g, "");
}

export function validateDocument(type: DocumentType | "", number: string): string | null {
  if (type === "") return "Elegí un tipo de documento, o indicá que no lo tenés a mano.";
  if (type === "none") return null;

  const normalized = normalizeDocumentNumber(number);
  if (normalized.length === 0) return "Escribí el número de documento.";

  switch (type) {
    case "dni":
      return /^\d{7,8}$/.test(normalized)
        ? null
        : "El DNI tiene 7 u 8 números. Podés escribirlo con o sin puntos.";
    case "passport":
      return /^[A-Za-z0-9]{6,12}$/.test(normalized)
        ? null
        : "El pasaporte tiene entre 6 y 12 letras o números.";
    case "foreign_id":
      return /^[A-Za-z0-9]{4,20}$/.test(normalized)
        ? null
        : "Escribí el número tal como figura en el documento (entre 4 y 20 letras o números).";
  }
}

export type BirthDate = { year: number; month: number; day: number };

function todayParts(now: Date): BirthDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function compareDates(a: BirthDate, b: BirthDate) {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Fecha válida del calendario o null. No mira el rango (futuro / demasiado antigua). */
export function parseBirthDate(day: string, month: string, year: string): BirthDate | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const parts = { year: Number(year), month: Number(month), day: Number(day) };
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const isReal =
    date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() === parts.month - 1 &&
    date.getUTCDate() === parts.day;
  return isReal ? parts : null;
}

export function validateBirthDate(day: string, month: string, year: string, now: Date): string | null {
  const d = day.trim();
  const m = month.trim();
  const y = year.trim();

  if (!d && !m && !y) return "Ingresá la fecha de nacimiento.";
  if (!d || !m || !y) return "Completá día, mes y año.";
  if (![d, m, y].every((part) => /^\d+$/.test(part))) return "Usá solo números en la fecha.";
  if (y.length !== 4) return "Escribí el año con 4 cifras (por ejemplo, 1990).";

  const birth = parseBirthDate(d, m, y);
  if (!birth) return "Esa fecha no existe. Revisá el día y el mes.";

  const today = todayParts(now);
  if (compareDates(birth, today) > 0) return "La fecha de nacimiento no puede ser futura.";
  if (today.year - birth.year > MAX_AGE_YEARS) return "Revisá el año: parece demasiado lejano.";
  return null;
}

/** Edad cumplida en años, o null si la fecha no es válida o es futura. */
export function getAgeYears(day: string, month: string, year: string, now: Date): number | null {
  const birth = parseBirthDate(day.trim(), month.trim(), year.trim());
  if (!birth) return null;
  const today = todayParts(now);
  if (compareDates(birth, today) > 0) return null;

  let age = today.year - birth.year;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age -= 1;
  return age;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(value: string): string | null {
  const text = value.trim();
  if (text.length === 0) return null; // opcional
  if (text.length > CONTACT_MAX_LENGTH) return `Usá hasta ${CONTACT_MAX_LENGTH} caracteres.`;
  if (EMAIL_PATTERN.test(text)) return null;
  if (/^\d{6,15}$/.test(text.replace(/[\s()+.\-]/g, ""))) return null;
  return "Escribí un email o un teléfono válido, o dejá el campo vacío.";
}

export function validateIdentification(id: Identification, now: Date): IdentificationErrors {
  const errors: IdentificationErrors = {};

  const firstName = validateName(id.firstName, "nombre");
  if (firstName) errors.firstName = firstName;
  const lastName = validateName(id.lastName, "apellido");
  if (lastName) errors.lastName = lastName;

  const documentType = id.documentType === "" ? validateDocument("", "") : null;
  if (documentType) errors.documentType = documentType;
  else {
    const documentNumber = validateDocument(id.documentType, id.documentNumber);
    if (documentNumber) errors.documentNumber = documentNumber;
  }

  const birth = validateBirthDate(id.birthDay, id.birthMonth, id.birthYear, now);
  if (birth) errors.birthDate = birth;

  const contact = validateContact(id.contact);
  if (contact) errors.contact = contact;

  return errors;
}

export function isIdentificationValid(id: Identification, now: Date) {
  return Object.keys(validateIdentification(id, now)).length === 0;
}

/** "15/06/1990" con ceros a la izquierda, o null si no hay fecha válida. */
export function formatBirthDate(id: Pick<Identification, "birthDay" | "birthMonth" | "birthYear">) {
  const birth = parseBirthDate(id.birthDay.trim(), id.birthMonth.trim(), id.birthYear.trim());
  if (!birth) return null;
  return `${String(birth.day).padStart(2, "0")}/${String(birth.month).padStart(2, "0")}/${birth.year}`;
}
