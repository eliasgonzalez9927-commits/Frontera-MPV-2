"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  getGuardRedirect,
  getNextRoute,
  getPreviousRoute,
  resolveBack,
  resolveContinue,
  routes,
} from "@/lib/v2/flow/routes";
import type { FlowRoute } from "@/lib/v2/flow/routes";
import type { FlowState } from "@/lib/v2/flow/state";
import { useFlow } from "./FlowProvider";

/**
 * Navegación común a todas las pantallas del recorrido. Respeta el modo "editando desde la
 * revisión": al continuar se sigue por lo pendiente y, si no queda nada, se vuelve a P07.
 */
export function useFlowNavigation() {
  const router = useRouter();
  const { state, dispatch, now, simulation, setSimulation } = useFlow();

  /** `nextState` permite decidir con un estado que todavía no se reflejó en el render. */
  function continueTo(defaultNext: string, nextState: FlowState = state) {
    // E03 simulado: la conexión falla al avanzar. No se pierde nada; al reintentar, avanza.
    if (simulation.advanceFailures > 0) {
      setSimulation((s) => ({ ...s, advanceFailures: s.advanceFailures - 1, advanceError: true }));
      return;
    }
    if (simulation.advanceError) setSimulation((s) => ({ ...s, advanceError: false }));
    const target = resolveContinue(nextState, defaultNext, now);
    if (nextState.editFromReview && target === routes.review) dispatch({ type: "finishEdit" });
    router.push(target);
  }

  /** Devuelve la acción de volver, o undefined si no hay pantalla anterior. */
  function backTo(defaultPrevious: string | null) {
    const target = resolveBack(state, defaultPrevious, now);
    if (!target) return undefined;
    return () => {
      if (target === routes.review) dispatch({ type: "finishEdit" });
      router.push(target);
    };
  }

  return { state, dispatch, now, continueTo, backTo };
}

// Centraliza lo que toda pantalla del recorrido necesita: guarda de acceso, siguiente y anterior.
// `suspendGuard`: la pantalla está a punto de salir por su cuenta (p. ej. al reiniciar el
// recorrido), así que no debe redirigir por "faltan pasos" mientras el estado se vacía.
export function useFlowScreen(route: FlowRoute, options: { suspendGuard?: boolean } = {}) {
  const router = useRouter();
  const { state, dispatch, now, continueTo, backTo } = useFlowNavigation();
  const redirect = options.suspendGuard ? null : getGuardRedirect(state, route, now);

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  return {
    state,
    dispatch,
    now,
    /** false mientras se redirige por falta de pasos previos: no renderizar la pantalla. */
    allowed: redirect === null,
    goNext: () => continueTo(getNextRoute(state, route)),
    goBack: backTo(getPreviousRoute(state, route)),
  };
}
