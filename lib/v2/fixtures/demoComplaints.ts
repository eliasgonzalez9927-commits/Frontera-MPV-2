import type { DemoScenarioId } from "../flow/state";

// Ejemplos ficticios para probar el recorrido. No son casos clínicos ni definen gravedad.
export const demoComplaints: Array<{ id: DemoScenarioId; label: string; text: string }> = [
  {
    id: "musculoskeletal",
    label: "Un golpe o torcedura",
    text: "Me torcí el tobillo jugando al fútbol y me duele cuando apoyo el pie.",
  },
  {
    id: "abdominal",
    label: "Dolor de panza",
    text: "Me duele la panza desde anoche y tengo ganas de vomitar.",
  },
  {
    id: "unidentified",
    label: "No sé explicarlo bien",
    text: "No me siento bien desde hoy, pero no sé explicar bien qué es.",
  },
];

export const demoScenarioLabels: Record<DemoScenarioId, string> = {
  musculoskeletal: "Un golpe o torcedura",
  abdominal: "Dolor de panza",
  unidentified: "No sé explicarlo bien",
};
