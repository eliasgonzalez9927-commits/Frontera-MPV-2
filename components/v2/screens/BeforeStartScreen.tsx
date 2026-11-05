"use client";

import { ArrowRight, FileText, Lock, Siren, Stethoscope } from "lucide-react";
import { useRef, useState } from "react";
import { routes } from "@/lib/v2/flow/routes";
import { useFlowScreen } from "../flow/useFlowScreen";
import { PrivacySheet } from "../patient/PrivacySheet";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ChoiceCard } from "../ui/ChoiceCard";
import { FieldError } from "../ui/FieldError";
import { PatientShell } from "../ui/PatientShell";
import { StageProgress } from "../ui/StageProgress";

const items = [
  {
    Icon: Stethoscope,
    title: "Frontera no reemplaza una evaluación médica",
    text: "No da diagnósticos ni indica tratamientos. Quien te evalúa es el equipo de la institución.",
  },
  {
    Icon: Siren,
    title: "Si es una emergencia, pedí ayuda ya",
    text: "Avisá al personal de la guardia ahora. No esperes a terminar este formulario.",
  },
  {
    Icon: Lock,
    title: "Tu privacidad",
    text: "Compartís solo lo necesario para preparar tu ingreso. En esta demostración no se guarda ni se envía nada.",
  },
  {
    Icon: FileText,
    title: "Qué pasará con tus datos",
    text: "En una implementación real, la institución te va a informar quién los ve y por cuánto tiempo, antes de que respondas.",
  },
];

// P03 — Antes de comenzar
export function BeforeStartScreen() {
  const { state, dispatch, allowed, goNext, goBack } = useFlowScreen(routes.info);
  const [showError, setShowError] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const ackRef = useRef<HTMLDivElement>(null);

  if (!allowed) return null;

  const missing = showError && !state.readAcknowledged;

  function handleContinue() {
    if (!state.readAcknowledged) {
      setShowError(true);
      ackRef.current?.querySelector("input")?.focus();
      return;
    }
    goNext();
  }

  return (
    <PatientShell
      onBack={goBack}
      progress={<StageProgress current="informacion" />}
      footer={
        <ActionFooter>
          <Button iconRight={<ArrowRight className="size-5" aria-hidden="true" />} onClick={handleContinue}>
            Continuar
          </Button>
        </ActionFooter>
      }
    >
      <h1 className="f2-question">Antes de comenzar</h1>
      <p className="f2-body mt-2 text-f2-muted">Es importante que tengas esto presente.</p>

      <ul className="mt-6 divide-y divide-f2-border border-y border-f2-border">
        {items.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 py-4">
            <Icon className="mt-0.5 size-6 shrink-0 text-f2-brand" aria-hidden="true" />
            <div>
              <h2 className="f2-option">{title}</h2>
              <p className="f2-support mt-0.5 text-f2-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2">
        <Button variant="ghost" fullWidth={false} onClick={() => setPrivacyOpen(true)}>
          Ver más sobre privacidad
        </Button>
      </div>

      <div ref={ackRef} className="mt-4">
        <ChoiceCard
          type="checkbox"
          name="read-ack"
          value="read"
          label="Leí y entendí esta información"
          description="Es solo una confirmación de lectura, no un consentimiento legal."
          checked={state.readAcknowledged}
          invalid={missing}
          onChange={(checked) => dispatch({ type: "setAcknowledged", value: checked })}
        />
        {missing && <FieldError id="read-ack-error">Confirmá que leíste la información para continuar.</FieldError>}
      </div>

      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </PatientShell>
  );
}
