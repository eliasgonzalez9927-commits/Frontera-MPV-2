"use client";

import { Building2, OctagonAlert, PauseCircle, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { routes } from "@/lib/v2/flow/routes";
import { useFlow } from "../flow/FlowProvider";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";
import { StatusScreen } from "../ui/StatusScreen";

function useReturn() {
  const router = useRouter();
  const { simulation } = useFlow();
  return () => router.push(simulation.returnTo ?? routes.welcome);
}

// E01 — Emergencia simulada. Solo se llega desde el control de pruebas.
export function EmergencyScreen({ place }: { place: "inside" | "outside" }) {
  const back = useReturn();
  const inside = place === "inside";

  return (
    <PatientShell
      footer={
        <ActionFooter>
          <Button variant="secondary" onClick={back}>
            Terminar la simulación
          </Button>
        </ActionFooter>
      }
    >
      <Notice variant="alert" title="Simulación de seguridad" live>
        Esta pantalla es un ejemplo. Aparece solo porque se activó desde las herramientas de
        demostración: Frontera no evalúa lo que escribís.
      </Notice>

      <StatusScreen
        tone="danger"
        icon={<OctagonAlert className="size-7" />}
        title={inside ? "Pedí ayuda al personal ahora" : "Pedí ayuda de emergencia ahora"}
        description={
          inside
            ? "Acercate al personal de la institución o pedí a alguien que lo llame. No hace falta seguir con el formulario."
            : "Comunicate con el servicio de emergencias de tu zona o pedí a alguien cercano que lo haga. No hace falta seguir con el formulario."
        }
      >
        <p className="f2-label text-f2-muted">Texto de demostración: lo define cada institución.</p>
      </StatusScreen>
    </PatientShell>
  );
}

// E02 — Sesión interrumpida.
export function PausedScreen() {
  const router = useRouter();
  const back = useReturn();
  const { dispatch, setSimulation } = useFlow();
  const [confirm, setConfirm] = useState(false);

  function restart() {
    dispatch({ type: "reset" });
    setSimulation((s) => ({ ...s, returnTo: null }));
    router.push(routes.welcome);
  }

  return (
    <PatientShell
      footer={
        <ActionFooter>
          <Button onClick={back}>Continuar donde estaba</Button>
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            Empezar de nuevo
          </Button>
        </ActionFooter>
      }
    >
      <StatusScreen
        icon={<PauseCircle className="size-7" />}
        title="Tu consulta quedó en pausa"
        description="Lo que cargaste sigue en este dispositivo mientras no cierres la pestaña. Podés seguir o empezar de nuevo."
      />

      <ConfirmDialog
        open={confirm}
        title="¿Empezar de nuevo?"
        description="Se borran las respuestas y los datos de ejemplo de esta demostración."
        confirmLabel="Empezar de nuevo"
        cancelLabel="Seguir con mi consulta"
        destructive
        onConfirm={restart}
        onCancel={() => setConfirm(false)}
      />
    </PatientShell>
  );
}

// E04 — Institución no disponible.
export function UnavailableScreen() {
  const router = useRouter();
  const back = useReturn();

  return (
    <PatientShell
      footer={
        <ActionFooter>
          <Button iconLeft={<WifiOff className="size-5" aria-hidden="true" />} onClick={back}>
            Reintentar
          </Button>
          <Button variant="secondary" onClick={() => router.push(routes.welcome)}>
            Ir al inicio
          </Button>
        </ActionFooter>
      }
    >
      <StatusScreen
        tone="warn"
        icon={<Building2 className="size-7" />}
        title="La institución no está disponible ahora"
        description="No pudimos comunicarnos con la institución. Tus respuestas no se perdieron. Probá de nuevo en unos minutos."
      >
        <Notice variant="info">
          Si necesitás atención ahora, acercate a la institución o pedí ayuda a alguien cercano.
        </Notice>
      </StatusScreen>
    </PatientShell>
  );
}
