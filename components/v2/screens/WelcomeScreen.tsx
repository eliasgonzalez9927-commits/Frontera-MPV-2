"use client";

import { ArrowRight, ClipboardCheck, Hospital, Lock, MessageSquareText, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { routes } from "@/lib/v2/flow/routes";
import { useFlow } from "../flow/FlowProvider";
import { PrivacySheet } from "../patient/PrivacySheet";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";

const steps = [
  { Icon: MessageSquareText, title: "Contás qué te pasa", text: "Con tus palabras, en pocas preguntas." },
  { Icon: ClipboardCheck, title: "Revisás y corregís", text: "Antes de enviar, podés cambiar lo que quieras." },
  { Icon: Ticket, title: "Recibís un pase", text: "Lo mostrás al llegar para agilizar tu ingreso." },
];

// P01 — Bienvenida
export function WelcomeScreen() {
  const router = useRouter();
  const { state } = useFlow();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <PatientShell
      footer={
        <ActionFooter>
          <Button iconRight={<ArrowRight className="size-5" aria-hidden="true" />} onClick={() => router.push(routes.context)}>
            Comenzar
          </Button>
        </ActionFooter>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl border border-f2-border bg-f2-surface p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-f2-brand-soft text-f2-brand" aria-hidden="true">
          <Hospital className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="f2-label text-f2-muted">Institución</p>
          <p className="f2-option">{state.institution.name}</p>
          {state.institution.simulatedSelection && (
            <p className="f2-label mt-1 inline-block rounded-full bg-f2-warn-soft px-2.5 py-0.5 text-f2-warn">
              Selección simulada
            </p>
          )}
        </div>
      </div>

      <h1 className="f2-hero mt-8">Preparemos tu ingreso a urgencias</h1>
      <p className="f2-body mt-3 text-f2-muted">
        Respondé unas pocas preguntas con tus palabras. Así el equipo de admisión te recibe con tu
        información ya ordenada.
      </p>

      <div className="mt-6">
        <Notice variant="danger" title="¿Es una emergencia?">
          Pedí ayuda ahora al personal de la institución o contactá a los servicios de emergencias. No
          esperes a completar este formulario.
        </Notice>
      </div>

      <ol className="mt-8 space-y-4">
        {steps.map(({ Icon, title, text }, index) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-f2-brand-soft text-f2-brand" aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="f2-option">
                <span className="sr-only">Paso {index + 1}: </span>
                {title}
              </p>
              <p className="f2-support text-f2-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-3">
        <Notice variant="info" title="Qué hace y qué no hace Frontera">
          No reemplaza una evaluación médica: no da diagnósticos, no indica tratamientos y no define
          quién se atiende primero.
        </Notice>
        <p className="f2-support text-f2-muted">
          Texto de demostración: el contenido final requiere aprobación clínica y local.
        </p>
      </div>

      <div className="mt-4">
        <Button
          variant="ghost"
          fullWidth={false}
          iconLeft={<Lock className="size-5" aria-hidden="true" />}
          onClick={() => setPrivacyOpen(true)}
        >
          Cómo se usa tu información
        </Button>
      </div>

      <p className="f2-support mt-8 border-t border-f2-border pt-4 text-f2-muted">
        Herramienta de demostración (no es parte del recorrido del paciente):{" "}
        <Link href="/v2/demo" className="f2-focus text-f2-brand underline underline-offset-4">
          ver herramientas
        </Link>
      </p>

      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </PatientShell>
  );
}
