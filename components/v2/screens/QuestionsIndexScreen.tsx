"use client";

import { routes } from "@/lib/v2/flow/routes";
import { useFlowScreen } from "../flow/useFlowScreen";

// /v2/preguntas no tiene contenido propio: lleva a la primera pregunta del recorrido.
export function QuestionsIndexScreen() {
  useFlowScreen(routes.questions);
  return null;
}
