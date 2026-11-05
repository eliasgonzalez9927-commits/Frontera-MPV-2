"use client";

import { useState } from "react";
import { ActionFooter } from "@/components/v2/ui/ActionFooter";
import { Button } from "@/components/v2/ui/Button";
import { ChoiceCard } from "@/components/v2/ui/ChoiceCard";
import { ChoiceGroup } from "@/components/v2/ui/ChoiceGroup";
import { PatientShell } from "@/components/v2/ui/PatientShell";
import { StageProgress } from "@/components/v2/ui/StageProgress";

// Pantalla de muestra para revisar el shell en distintos anchos (se carga dentro de un iframe).
export default function ShellPreview() {
  const [value, setValue] = useState("");

  return (
    <PatientShell
      onBack={() => {}}
      progress={<StageProgress current="contexto" />}
      footer={
        <ActionFooter>
          <Button disabled={!value}>Continuar</Button>
        </ActionFooter>
      }
    >
      <ChoiceGroup legend="¿Para quién estás haciendo esta consulta?" required>
        <ChoiceCard
          type="radio"
          name="preview-context"
          value="self"
          checked={value === "self"}
          onChange={() => setValue("self")}
          label="Para mí"
        />
        <ChoiceCard
          type="radio"
          name="preview-context"
          value="other"
          checked={value === "other"}
          onChange={() => setValue("other")}
          label="Para otra persona"
          description="Un menor a cargo, un adulto acompañado u otra persona."
        />
      </ChoiceGroup>
    </PatientShell>
  );
}
