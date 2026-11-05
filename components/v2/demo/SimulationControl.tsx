"use client";

import { FlaskConical, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { exceptionRoutes, isExceptionRoute } from "@/lib/v2/flow/exceptions";
import { routes } from "@/lib/v2/flow/routes";
import { useFlow } from "../flow/FlowProvider";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

type Option = { id: string; label: string; hint: string; run: () => void };

// Control de pruebas: es la ÚNICA forma de llegar a E01–E04. No forma parte del recorrido real
// y se identifica como herramienta de demostración.
export function SimulationControl() {
  const router = useRouter();
  const pathname = usePathname();
  const { simulation, setSimulation, dispatch } = useFlow();
  const [open, setOpen] = useState(false);

  function go(route: string) {
    setSimulation((s) => ({ ...s, returnTo: isExceptionRoute(pathname) ? s.returnTo : pathname }));
    setOpen(false);
    router.push(route);
  }

  const options: Option[] = [
    {
      id: "emergency",
      label: "Emergencia simulada",
      hint: "E01. Pantalla de seguridad: pide avisar al personal de la guardia.",
      run: () => go(exceptionRoutes.emergency),
    },
    {
      id: "paused",
      label: "Sesión interrumpida",
      hint: "E02. Ofrece continuar o empezar de nuevo.",
      run: () => go(exceptionRoutes.paused),
    },
    {
      id: "advance-error",
      label: "Error de conexión al continuar",
      hint: "E03. El próximo “Continuar” falla una vez; al reintentar, avanza.",
      run: () => {
        setSimulation((s) => ({ ...s, advanceFailures: 1, advanceError: false }));
        setOpen(false);
      },
    },
    {
      id: "send-error",
      label: "Error de conexión al enviar",
      hint: "E03. El próximo envío falla una vez; las respuestas se conservan.",
      run: () => {
        setSimulation((s) => ({ ...s, sendFailures: 1 }));
        setOpen(false);
      },
    },
    {
      id: "unavailable",
      label: "Institución no disponible",
      hint: "E04. La institución no responde.",
      run: () => go(exceptionRoutes.unavailable),
    },
    {
      id: "restart",
      label: "Empezar la demostración de nuevo",
      hint: "Borra los datos de ejemplo y vuelve a la bienvenida.",
      run: () => {
        setOpen(false);
        dispatch({ type: "reset" });
        setSimulation((s) => ({ ...s, sendFailures: 0, advanceFailures: 0, advanceError: false }));
        router.push(routes.welcome);
      },
    },
  ];

  return (
    <>
      <div className="mt-10 border-t border-dashed border-f2-border pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="f2-label f2-focus inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-f2-muted hover:bg-f2-brand-soft"
        >
          <FlaskConical className="size-4" aria-hidden="true" />
          Herramientas de demostración
        </button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="sim-title" describedBy="sim-desc">
        <div className="flex items-start justify-between gap-3">
          <h2 id="sim-title" className="f2-title">
            Simular una situación
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="f2-focus -mr-2 -mt-1 inline-flex size-11 items-center justify-center rounded-lg hover:bg-f2-brand-soft"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p id="sim-desc" className="f2-support mt-1 text-f2-muted">
          Solo para la demostración. Nada de esto se detecta a partir de lo que escribas.
        </p>
        {(simulation.sendFailures > 0 || simulation.advanceFailures > 0) && (
          <p role="status" className="f2-label mt-3 rounded-lg bg-f2-warn-soft px-3 py-2 text-f2-warn">
            Hay una falla de conexión programada.
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {options.map((option) => (
            <li key={option.id}>
              <Button variant="secondary" onClick={option.run} className="!justify-start text-left">
                <span className="block">
                  <span className="block">{option.label}</span>
                  <span className="f2-support block font-normal text-f2-muted">{option.hint}</span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
