"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import { flowReducer, hasProgress, initialFlowState } from "@/lib/v2/flow/state";
import type { FlowAction, FlowState } from "@/lib/v2/flow/state";

type FlowContextValue = {
  state: FlowState;
  dispatch: Dispatch<FlowAction>;
  /** "Hoy" fijado al abrir el prototipo: las validaciones de fecha usan siempre el mismo valor. */
  now: Date;
};

const FlowContext = createContext<FlowContextValue | null>(null);

// Estado del recorrido en memoria. Vive en el layout de /v2, así que sobrevive a la navegación
// entre pantallas (incluido Volver) pero se pierde al recargar: no hay persistencia a propósito.
export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const [now] = useState(() => new Date());
  const value = useMemo(() => ({ state, dispatch, now }), [state, now]);
  const progress = hasProgress(state);

  // Confirmación del navegador al cerrar o recargar con respuestas cargadas.
  useEffect(() => {
    if (!progress) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [progress]);

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) throw new Error("useFlow debe usarse dentro de <FlowProvider>");
  return context;
}
