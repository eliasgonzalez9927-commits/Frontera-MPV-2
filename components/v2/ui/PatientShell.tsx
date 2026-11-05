"use client";

import { ChevronLeft, CircleHelp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SimulationControl } from "../demo/SimulationControl";
import { useFlow } from "../flow/FlowProvider";
import { HelpSheet } from "./HelpSheet";
import { Logo } from "./Logo";
import { Notice } from "./Notice";

type PatientShellProps = {
  children: ReactNode;
  /** Barra de progreso (StageProgress). */
  progress?: ReactNode;
  /** Área inferior de acciones (ActionFooter). */
  footer?: ReactNode;
  /** Si se omite, no se muestra el botón Volver. */
  onBack?: () => void;
  institutionName?: string;
};

export const DEMO_INSTITUTION = "Hospital Demo Frontera";

// Al navegar entre pantallas llevamos el foco al contenido nuevo (la primera carga no lo roba).
let shellRenderedBefore = false;

export function PatientShell({
  children,
  progress,
  footer,
  onBack,
  institutionName = DEMO_INSTITUTION,
}: PatientShellProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const { simulation } = useFlow();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shellRenderedBefore) mainRef.current?.focus({ preventScroll: true });
      shellRenderedBefore = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="f2-label sr-only z-50 rounded-lg bg-f2-brand px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      <div className="bg-f2-warn-soft text-f2-warn">
        <p className="f2-label mx-auto w-full max-w-[560px] px-4 py-1.5 text-center">
          Prototipo de demostración · datos ficticios
        </p>
      </div>

      <header className="sticky top-0 z-20 border-b border-f2-border bg-f2-bg">
        <div className="mx-auto w-full max-w-[560px] px-4">
          <div className="flex min-h-14 items-center justify-between gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="f2-label f2-focus -ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-f2-ink hover:bg-f2-brand-soft"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
                Volver
              </button>
            ) : (
              <span className="w-[76px]" aria-hidden="true" />
            )}

            <Logo />

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="f2-label f2-focus -mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-f2-ink hover:bg-f2-brand-soft"
            >
              <CircleHelp className="size-5" aria-hidden="true" />
              Ayuda
            </button>
          </div>
          <p className="f2-label truncate pb-2 text-center font-normal text-f2-muted">
            {institutionName}
          </p>
          {progress && <div className="pb-3">{progress}</div>}
        </div>
      </header>

      <main
        id="contenido"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-[560px] flex-1 px-4 py-6 outline-none md:py-10"
      >
        {simulation.advanceError && (
          <div role="alert" className="mb-6">
            <Notice variant="alert" title="No pudimos continuar">
              Parece que se cortó la conexión. Tus respuestas siguen acá. Volvé a tocar “Continuar”.
            </Notice>
          </div>
        )}
        {children}
        <SimulationControl />
      </main>

      {footer}

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
