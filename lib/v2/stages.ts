// Etapas visibles en la barra de progreso del portal del paciente.
export const stages = [
  { id: "contexto", label: "Contexto" },
  { id: "informacion", label: "Información" },
  { id: "motivo", label: "Motivo" },
  { id: "preguntas", label: "Preguntas" },
  { id: "datos", label: "Datos" },
  { id: "revision", label: "Revisión" },
] as const;

export type StageId = (typeof stages)[number]["id"];

export function getStageNumber(id: StageId) {
  return stages.findIndex((stage) => stage.id === id) + 1;
}
