"use client";

import { Building2, DoorOpen, IdCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { routes } from "@/lib/v2/flow/routes";
import { useFlowScreen } from "../flow/useFlowScreen";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DigitalPass } from "../ui/DigitalPass";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";

// Texto de demostración: el contenido real de llegada lo define cada institución.
const arrivalSteps = [
  { Icon: Building2, text: "Ya estás en la guardia: acercate a admisión." },
  { Icon: IdCard, text: "Mostrá este pase para que encuentren tu información." },
  { Icon: DoorOpen, text: "Esperá en la sala. Si te sentís peor, avisá al personal enseguida." },
];

// P08 — Pase digital (ficticio)
export function PassScreen() {
  const router = useRouter();
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const { state, dispatch, allowed, goBack } = useFlowScreen(routes.pass, { suspendGuard: restarting });

  if (!allowed) return null;

  const { firstName, lastName } = state.identification;
  const patientName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  function restart() {
    // Sin esto, al vaciar el estado la guarda de esta pantalla redirigiría a P02 en vez de a P01.
    setRestarting(true);
    dispatch({ type: "reset" });
    router.push(routes.welcome);
  }

  return (
    <PatientShell
      onBack={goBack}
      footer={
        <ActionFooter>
          <Button onClick={() => setConfirmRestart(true)}>Empezar de nuevo</Button>
          <Button variant="secondary" onClick={goBack}>
            Volver a la revisión
          </Button>
        </ActionFooter>
      }
    >
      <Notice variant="success" title="Simulación completada" live>
        No se envió ninguna información: esto es un ejemplo de cómo se vería tu pase.
      </Notice>

      <h1 className="f2-question mt-6">Tu pase de demostración</h1>
      <p className="f2-body mt-2 text-f2-muted">
        Así se vería el pase que mostrarías al llegar. El código y el QR son de ejemplo.
      </p>

      <div className="mt-6">
        <DigitalPass
          institutionName={state.institution.name}
          episodeCode={state.submission.episodeCode ?? "DEMO-0000-FICT"}
          patientName={patientName || undefined}
        />
      </div>

      <section aria-labelledby="arrival" className="mt-8">
        <h2 id="arrival" className="f2-subtitle">
          Qué sigue
        </h2>
        <p className="f2-label mt-1 text-f2-muted">Texto de demostración</p>
        <ol className="mt-3 space-y-3">
          {arrivalSteps.map(({ Icon, text }, index) => (
            <li key={text} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-f2-brand-soft text-f2-brand"
              >
                <Icon className="size-5" />
              </span>
              <p className="f2-body pt-1">
                <span className="sr-only">Paso {index + 1}: </span>
                {text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Notice variant="info" title="Qué no es este pase" className="mt-8">
        No representa un turno ni una prioridad clínica, y no define el orden de atención. Quien te
        evalúa es el equipo de la institución.
      </Notice>

      <ConfirmDialog
        open={confirmRestart}
        title="¿Empezar de nuevo?"
        description="Se borran las respuestas y los datos de ejemplo de esta demostración."
        confirmLabel="Empezar de nuevo"
        cancelLabel="Seguir viendo el pase"
        destructive
        onConfirm={restart}
        onCancel={() => setConfirmRestart(false)}
      />
    </PatientShell>
  );
}
