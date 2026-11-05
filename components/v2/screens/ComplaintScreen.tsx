"use client";

import { ArrowRight, FlaskConical } from "lucide-react";
import { useRef, useState } from "react";
import { demoComplaints, demoScenarioLabels } from "@/lib/v2/fixtures/demoComplaints";
import { routes } from "@/lib/v2/flow/routes";
import { COMPLAINT_MAX_LENGTH, validateComplaint } from "@/lib/v2/validation/complaint";
import { useFlowScreen } from "../flow/useFlowScreen";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";
import { StageProgress } from "../ui/StageProgress";
import { TextArea } from "../ui/TextField";

// P04 — Motivo de consulta
export function ComplaintScreen() {
  const { state, dispatch, allowed, goNext, goBack } = useFlowScreen(routes.complaint);
  const [showError, setShowError] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  if (!allowed) return null;

  const error = showError ? validateComplaint(state.complaint) : null;

  function handleContinue() {
    if (validateComplaint(state.complaint)) {
      setShowError(true);
      areaRef.current?.querySelector("textarea")?.focus();
      return;
    }
    goNext();
  }

  function removeExample() {
    // Si ya hay texto, pedimos confirmación antes de borrarlo.
    if (state.complaint.trim()) setConfirmClear(true);
    else dispatch({ type: "clearComplaint" });
  }

  return (
    <PatientShell
      onBack={goBack}
      progress={<StageProgress current="motivo" />}
      footer={
        <ActionFooter>
          <Button iconRight={<ArrowRight className="size-5" aria-hidden="true" />} onClick={handleContinue}>
            Continuar
          </Button>
        </ActionFooter>
      }
    >
      <div ref={areaRef}>
        <TextArea
          variant="question"
          label="¿Qué te está pasando?"
          hint="Contanos con tus palabras. No necesitás usar términos médicos."
          placeholder="Ej.: Me duele la panza desde anoche y no puedo comer."
          value={state.complaint}
          maxLength={COMPLAINT_MAX_LENGTH}
          showCount
          error={error ?? undefined}
          className="min-h-48"
          onChange={(event) => dispatch({ type: "setComplaint", value: event.target.value })}
        />
      </div>

      <Notice variant="info" className="mt-5">
        ¿No sabés cómo explicarlo? Escribí lo que sientas, aunque sea corto. Si es una emergencia,
        pedí ayuda al personal ahora.
      </Notice>

      <section aria-labelledby="demo-examples" className="mt-8 rounded-2xl border-2 border-dashed border-f2-warn-border bg-f2-warn-soft/50 p-4">
        <h2 id="demo-examples" className="f2-label flex items-center gap-2 text-f2-warn">
          <FlaskConical className="size-4" aria-hidden="true" />
          Solo demostración · ejemplos precargados
        </h2>
        <p className="f2-support mt-1 text-f2-muted">
          Son textos ficticios para probar el recorrido. No uses datos reales.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {demoComplaints.map((demo) => (
            <Button
              key={demo.id}
              variant="secondary"
              onClick={() => dispatch({ type: "loadDemoComplaint", scenario: demo.id, text: demo.text })}
            >
              {demo.label}
            </Button>
          ))}
        </div>

        {state.demoScenario && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2" role="status">
            <p className="f2-label text-f2-ink">Ejemplo cargado: {demoScenarioLabels[state.demoScenario]}</p>
            <Button variant="ghost" fullWidth={false} onClick={removeExample}>
              Quitar ejemplo
            </Button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="¿Borrar lo escrito?"
        description="Vas a quitar el ejemplo y el texto del motivo de consulta."
        confirmLabel="Borrar"
        cancelLabel="Conservar"
        destructive
        onConfirm={() => {
          dispatch({ type: "clearComplaint" });
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </PatientShell>
  );
}
