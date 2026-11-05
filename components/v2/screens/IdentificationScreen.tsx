"use client";

import { ArrowRight, FlaskConical } from "lucide-react";
import { useRef, useState } from "react";
import { buildDemoIdentification } from "@/lib/v2/fixtures/demoIdentity";
import { getBirthDateNotice } from "@/lib/v2/flow/review";
import { routes } from "@/lib/v2/flow/routes";
import {
  CONTACT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  documentTypeLabels,
  validateIdentification,
  type DocumentType,
  type IdentificationField,
} from "@/lib/v2/validation/identification";
import { useFlowScreen } from "../flow/useFlowScreen";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";
import { SelectField } from "../ui/SelectField";
import { StageProgress } from "../ui/StageProgress";
import { TextField } from "../ui/TextField";

const documentOptions = (Object.keys(documentTypeLabels) as DocumentType[]).map((value) => ({
  value,
  label: documentTypeLabels[value],
}));

const numberHints: Record<Exclude<DocumentType, "none">, string> = {
  dni: "7 u 8 números, con o sin puntos.",
  passport: "Tal como figura en el pasaporte.",
  foreign_id: "Tal como figura en el documento.",
};

// P06 — Datos del paciente
export function IdentificationScreen() {
  const { state, dispatch, now, allowed, goNext, goBack } = useFlowScreen(routes.identification);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<IdentificationField>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);

  if (!allowed) return null;

  const id = state.identification;
  const errors = validateIdentification(id, now);
  const visible = (field: IdentificationField) => (submitted || touched.has(field) ? errors[field] : undefined);
  const touch = (field: IdentificationField) => setTouched((current) => new Set(current).add(field));
  const patch = (values: Partial<typeof id>) => dispatch({ type: "setIdentification", patch: values });

  const isOther = state.patientContext === "other";
  const birthNotice = getBirthDateNotice(state, now);
  const hasNumber = id.documentType !== "" && id.documentType !== "none";

  function handleContinue() {
    if (Object.keys(errors).length > 0) {
      setSubmitted(true);
      // Espera al render con los errores visibles y lleva el foco al primer campo con problema.
      window.setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    goNext();
  }

  function fillWithExample() {
    patch(buildDemoIdentification(state.relationship, now));
    setSubmitted(false);
    setTouched(new Set());
  }

  return (
    <PatientShell
      onBack={goBack}
      progress={<StageProgress current="datos" />}
      footer={
        <ActionFooter>
          <Button iconRight={<ArrowRight className="size-5" aria-hidden="true" />} onClick={handleContinue}>
            Continuar
          </Button>
        </ActionFooter>
      }
    >
      <h1 className="f2-question">{isOther ? "Datos de la persona" : "Tus datos"}</h1>
      <p className="f2-body mt-2 text-f2-muted">
        Los usamos para identificarte al llegar. Pedimos solo lo necesario.
      </p>

      {isOther && (
        <Notice variant="info" className="mt-5">
          Ingresá los datos de la persona para la que respondés, no los tuyos.
        </Notice>
      )}

      <div ref={formRef} className="mt-6 space-y-6">
        <TextField
          label="Nombre"
          hint="Todos los nombres, tal como figuran en el documento."
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH}
          value={id.firstName}
          error={visible("firstName")}
          onChange={(event) => patch({ firstName: event.target.value })}
          onBlur={() => touch("firstName")}
        />

        <TextField
          label="Apellido"
          hint="Si tenés un solo nombre y no tenés apellido, repetí el nombre."
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH}
          value={id.lastName}
          error={visible("lastName")}
          onChange={(event) => patch({ lastName: event.target.value })}
          onBlur={() => touch("lastName")}
        />

        <SelectField
          label="Tipo de documento"
          hint="Si no tenés DNI, elegí pasaporte u otro documento de tu país."
          placeholder="Elegí una opción"
          options={documentOptions}
          value={id.documentType}
          error={visible("documentType")}
          onChange={(event) => patch({ documentType: event.target.value as DocumentType | "" })}
          onBlur={() => touch("documentType")}
        />

        {hasNumber && (
          <TextField
            label="Número de documento"
            hint={numberHints[id.documentType as Exclude<DocumentType, "none">]}
            autoComplete="off"
            inputMode={id.documentType === "dni" ? "numeric" : "text"}
            value={id.documentNumber}
            error={visible("documentNumber")}
            onChange={(event) => patch({ documentNumber: event.target.value })}
            onBlur={() => touch("documentNumber")}
          />
        )}

        {id.documentType === "none" && (
          <Notice variant="info">
            Podés continuar sin documento. Cómo se te identifica en ese caso lo define cada institución;
            en esta demostración no se verifica nada.
          </Notice>
        )}

        <DateField
          legend="Fecha de nacimiento"
          hint="Día, mes y año. Por ejemplo: 15 / 06 / 1990."
          day={id.birthDay}
          month={id.birthMonth}
          year={id.birthYear}
          error={visible("birthDate")}
          onChange={(part, value) =>
            patch({ [part === "day" ? "birthDay" : part === "month" ? "birthMonth" : "birthYear"]: value })
          }
          onBlur={() => touch("birthDate")}
        />

        {birthNotice && !errors.birthDate && (
          <Notice variant="alert" live>
            {birthNotice}
          </Notice>
        )}

        <TextField
          label="Contacto"
          optional
          hint="Un email o un teléfono, por si necesitan avisarte."
          autoComplete="off"
          maxLength={CONTACT_MAX_LENGTH}
          value={id.contact}
          error={visible("contact")}
          onChange={(event) => patch({ contact: event.target.value })}
          onBlur={() => touch("contact")}
        />
      </div>

      <Notice variant="info" title="Tu privacidad" className="mt-8">
        En esta demostración nada se guarda ni se envía. En una implementación real, la institución te
        informa quién ve estos datos y por cuánto tiempo.
      </Notice>

      <section aria-labelledby="demo-identity" className="mt-6 rounded-2xl border-2 border-dashed border-f2-warn-border bg-f2-warn-soft/50 p-4">
        <h2 id="demo-identity" className="f2-label flex items-center gap-2 text-f2-warn">
          <FlaskConical className="size-4" aria-hidden="true" />
          Solo demostración · datos de ejemplo
        </h2>
        <p className="f2-support mt-1 text-f2-muted">
          No escribas datos reales. Completá el formulario con datos ficticios de un solo toque.
        </p>
        <div className="mt-3">
          <Button variant="secondary" onClick={fillWithExample}>
            Completar con datos de ejemplo
          </Button>
        </div>
      </section>
    </PatientShell>
  );
}
