import type { Relationship } from "../flow/state";
import type { Identification } from "../validation/identification";

// Datos inequívocamente ficticios para completar P06 sin escribir nada real.
// "example.com" es un dominio reservado: ningún email de ejemplo llega a una persona real.

export function buildDemoIdentification(relationship: Relationship | null, now: Date): Identification {
  const isMinor = relationship === "minor";

  return {
    firstName: isMinor ? "Menor" : "Persona",
    lastName: "De Prueba",
    documentType: "dni",
    documentNumber: "00000000",
    birthDay: "15",
    birthMonth: "6",
    birthYear: String(isMinor ? now.getFullYear() - 8 : 1990),
    contact: "demo@example.com",
  };
}
