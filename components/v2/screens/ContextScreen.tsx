"use client";

import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { routes } from "@/lib/v2/flow/routes";
import { useFlowScreen } from "../flow/useFlowScreen";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ChoiceCard } from "../ui/ChoiceCard";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { PatientShell } from "../ui/PatientShell";
import { StageProgress } from "../ui/StageProgress";

// P02 — Contexto del paciente
export function ContextScreen() {
  const { state, dispatch, goNext, goBack } = useFlowScreen(routes.context);
  const [showError, setShowError] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  function handleContinue() {
    if (!state.patientContext) {
      setShowError(true);
      groupRef.current?.querySelector("input")?.focus();
      return;
    }
    goNext();
  }

  return (
    <PatientShell
      onBack={goBack}
      progress={<StageProgress current="contexto" />}
      footer={
        <ActionFooter>
          <Button iconRight={<ArrowRight className="size-5" aria-hidden="true" />} onClick={handleContinue}>
            Continuar
          </Button>
        </ActionFooter>
      }
    >
      <div ref={groupRef}>
        <ChoiceGroup
          legend="¿Para quién estás haciendo esta consulta?"
          required
          error={showError && !state.patientContext ? "Elegí una opción para continuar." : undefined}
        >
          <ChoiceCard
            type="radio"
            name="patient-context"
            value="self"
            label="Para mí"
            checked={state.patientContext === "self"}
            invalid={showError && !state.patientContext}
            onChange={() => dispatch({ type: "setContext", value: "self" })}
          />
          <ChoiceCard
            type="radio"
            name="patient-context"
            value="other"
            label="Para otra persona"
            description="Un menor a cargo, un adulto acompañado u otra persona."
            checked={state.patientContext === "other"}
            invalid={showError && !state.patientContext}
            onChange={() => dispatch({ type: "setContext", value: "other" })}
          />
        </ChoiceGroup>
      </div>
    </PatientShell>
  );
}
