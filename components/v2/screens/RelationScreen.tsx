"use client";

import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { routes } from "@/lib/v2/flow/routes";
import type { Relationship } from "@/lib/v2/flow/state";
import { useFlowScreen } from "../flow/useFlowScreen";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ChoiceCard } from "../ui/ChoiceCard";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";
import { StageProgress } from "../ui/StageProgress";

const options: Array<{ value: Relationship; label: string; description: string }> = [
  { value: "minor", label: "Menor a cargo", description: "Una persona menor de edad de la que estás a cargo." },
  { value: "accompanied_adult", label: "Adulto acompañado", description: "Una persona adulta que responde con tu ayuda." },
  {
    value: "cannot_respond",
    label: "Persona que no puede responder por sí misma",
    description: "Por ejemplo, porque no puede comunicarse en este momento.",
  },
];

// P02b — Relación con la persona (solo si la consulta es para otra persona)
export function RelationScreen() {
  const { state, dispatch, allowed, goNext, goBack } = useFlowScreen(routes.relation);
  const [showError, setShowError] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  if (!allowed) return null;

  const missing = showError && !state.relationship;

  function handleContinue() {
    if (!state.relationship) {
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
          legend="¿Quién es la persona para la que respondés?"
          required
          error={missing ? "Elegí una opción para continuar." : undefined}
        >
          {options.map((option) => (
            <ChoiceCard
              key={option.value}
              type="radio"
              name="relationship"
              value={option.value}
              label={option.label}
              description={option.description}
              checked={state.relationship === option.value}
              invalid={missing}
              onChange={() => dispatch({ type: "setRelationship", value: option.value })}
            />
          ))}
        </ChoiceGroup>
      </div>

      <Notice variant="info" className="mt-6">
        En esta demostración no se verifica quién representa a quién. Cómo se acredita esa relación se
        define más adelante, con cada institución.
      </Notice>
    </PatientShell>
  );
}
