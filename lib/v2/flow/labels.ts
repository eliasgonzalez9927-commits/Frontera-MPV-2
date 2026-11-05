import type { PatientContext, Relationship } from "./state";

export const contextLabels: Record<PatientContext, string> = {
  self: "Para mí",
  other: "Para otra persona",
};

export const relationshipLabels: Record<Relationship, string> = {
  minor: "Menor a cargo",
  accompanied_adult: "Adulto acompañado",
  cannot_respond: "Persona que no puede responder por sí misma",
};
