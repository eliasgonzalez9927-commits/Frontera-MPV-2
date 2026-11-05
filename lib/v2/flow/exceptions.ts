// Excepciones del recorrido (E01–E04). Solo se activan desde el control de simulación:
// nada de esto se deduce de lo que la persona escribe o responde.

export const exceptionRoutes = {
  /** E01 — emergencia simulada. La demostración siempre transcurre dentro de la guardia. */
  emergency: "/v2/emergencia",
  /** E02 — sesión interrumpida. */
  paused: "/v2/pausa",
  /** E04 — institución no disponible. */
  unavailable: "/v2/no-disponible",
} as const;

export type ExceptionRoute = (typeof exceptionRoutes)[keyof typeof exceptionRoutes];

/** Fallas de conexión programadas (E03). Cada una se consume al ocurrir: el reintento funciona. */
export type SimulationState = {
  sendFailures: number;
  advanceFailures: number;
  /** Hay un error de avance visible (el botón Continuar no pudo avanzar). */
  advanceError: boolean;
  /** Pantalla desde la que se activó una excepción, para poder volver. */
  returnTo: string | null;
};

export const initialSimulation: SimulationState = {
  sendFailures: 0,
  advanceFailures: 0,
  advanceError: false,
  returnTo: null,
};

export function isExceptionRoute(pathname: string) {
  return (Object.values(exceptionRoutes) as string[]).includes(pathname);
}
