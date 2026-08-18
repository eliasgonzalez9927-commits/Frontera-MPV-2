"use client";

import Link from "next/link";
import type { TriageResult, Priority } from "@/lib/triage";
import { getPriorityLabel } from "@/lib/triage";
import { getOrientationMessage } from "@/lib/triageConversation";
import { getCaseOriginLabel } from "@/lib/triageCases";

const EMERGENCY_PHONE_HREF = "tel:107";

type ResultViewProps = {
  caseData: TriageResult;
  notice?: string;
};

function priorityClass(priority: Priority) {
  const classes: Record<Priority, string> = {
    ROJO: "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]",
    NARANJA: "border-[var(--status-caution-border)] bg-[var(--status-caution-bg)] text-[var(--status-caution-text)]",
    AMARILLO: "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
    VERDE: "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
    AZUL: "border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
  };

  return classes[priority];
}

function formatCaseDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} · ${hours}:${minutes} hs`;
}

export default function ResultView({ caseData, notice }: ResultViewProps) {
  const createdAt = formatCaseDate(caseData.createdAt);
  const isRedProtocol = caseData.priority === "ROJO";
  const isOrientationFlow = caseData.handover.entryMode === "needs_orientation";
  const originLabel = getCaseOriginLabel(caseData);
  const orientationMessage =
    caseData.handover.orientationMessage ??
    getOrientationMessage(caseData.priority);

  return (
    <main className="min-h-screen bg-[var(--surface)] px-6 py-8 text-[var(--text)]">
      <section className="mx-auto max-w-4xl">
        <Link href="/pretriaje" className="text-sm text-[var(--accent-text)]">
          ← Nuevo pre-triaje
        </Link>

        {notice && (
          <div className="mt-6 rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 text-sm text-[var(--status-warning-text)]">
            {notice}
          </div>
        )}

        {isRedProtocol && (
          <section className="mt-8 rounded-[2rem] border p-6 shadow-2xl"
            style={{
              backgroundColor: "var(--alert-bg)",
              borderColor: "var(--alert-border)",
              boxShadow: "0 25px 50px -12px var(--alert-shadow)",
            }}
          >
            <p
              className="text-sm font-black uppercase tracking-[0.2em]"
              style={{ color: "var(--alert-text)" }}
            >
              Protocolo Rojo
            </p>
            <h1
              className="mt-3 text-4xl font-black tracking-tight"
              style={{ color: "var(--alert-text)" }}
            >
              Posible emergencia
            </h1>
            <p
              className="mt-3 max-w-2xl text-lg leading-7"
              style={{ color: "var(--alert-text-soft)" }}
            >
              Por lo que contás, podrías necesitar atención inmediata. No
              esperes a completar más pasos si los síntomas continúan o
              empeoran.
            </p>
            <p
              className="mt-3 text-sm font-semibold"
              style={{ color: "var(--alert-text-soft)" }}
            >
              Frontera no reemplaza a emergencias.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={EMERGENCY_PHONE_HREF}
                className="rounded-2xl px-5 py-3 text-center font-black transition hover:opacity-90"
                style={{
                  backgroundColor: "var(--alert-button-bg)",
                  color: "var(--alert-button-text)",
                }}
              >
                Llamar emergencias
              </a>
              <button
                type="button"
                className="rounded-2xl border px-5 py-3 font-black transition hover:opacity-80"
                style={{
                  borderColor: "var(--alert-button-border)",
                  color: "var(--alert-text)",
                }}
              >
                Ir a guardia ahora
              </button>
            </div>
          </section>
        )}

        {isOrientationFlow && (
          <section
            className={`mt-8 rounded-[2rem] border p-6 ${
              isRedProtocol
                ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]"
                : "border-[#00C9A7]/30 bg-[#00C9A7]/10"
            }`}
          >
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent-text)]">
              Orientación general
            </p>
            <h2 className="mt-3 text-2xl font-black">
              Prioridad estimada: {caseData.priority} ·{" "}
              {getPriorityLabel(caseData.priority)}
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--text)]">
              {orientationMessage}
            </p>
            <p className="mt-4 text-sm font-bold text-[var(--text-secondary)]">
              Código de caso: {caseData.caseCode}
            </p>
            <p className="mt-4 rounded-2xl border border-[var(--border)] bg-black/20 p-4 text-sm leading-6 text-[var(--text-secondary)]">
              Frontera no diagnostica, no reemplaza una evaluación médica y no
              envía ambulancias automáticamente.
            </p>
          </section>
        )}

        <div
          className={`mt-8 grid gap-6 ${
            isRedProtocol ? "" : "lg:grid-cols-[0.8fr_1.2fr]"
          }`}
        >
          {!isRedProtocol && (
            <aside
              className={`rounded-[2rem] border p-6 ${priorityClass(
                caseData.priority
              )}`}
            >
              <p className="text-sm font-semibold opacity-80">
                Prioridad estimada
              </p>
              <h1 className="mt-3 text-5xl font-black">{caseData.priority}</h1>
              <p className="mt-2 text-xl font-bold">
                {getPriorityLabel(caseData.priority)}
              </p>

              <div className="mt-6 rounded-2xl bg-black/20 p-4 text-sm leading-6">
                {caseData.recommendation}
              </div>

              <p className="mt-6 text-xs opacity-75">
                Código de caso: {caseData.caseCode}
              </p>
            </aside>
          )}

          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-overlay-05)] p-6">
            <p className="text-sm font-semibold text-[var(--accent-text)]">
              Resumen para el equipo médico
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#00C9A7]/30 bg-[#00C9A7]/10 p-4">
                <p className="text-sm text-[var(--accent-text)]">Pase Digital Frontera</p>
                <p className="mt-1 text-3xl font-black tracking-wide text-[var(--text)]">
                  {caseData.caseCode}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Presentá este código al llegar a admisión o enfermería.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                  <p className="text-sm text-[var(--text-tertiary)]">Prioridad estimada</p>
                  <p className="mt-1 font-semibold">
                    {caseData.priority} · {getPriorityLabel(caseData.priority)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                  <p className="text-sm text-[var(--text-tertiary)]">Origen</p>
                  <p className="mt-1 font-semibold">{originLabel}</p>
                </div>

                <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                  <p className="text-sm text-[var(--text-tertiary)]">Fecha y hora</p>
                  <p className="mt-1 font-semibold">{createdAt}</p>
                </div>

                <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                  <p className="text-sm text-[var(--text-tertiary)]">Paciente</p>
                  <p className="mt-1 font-semibold">
                    {caseData.patientLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                <p className="text-sm text-[var(--text-tertiary)]">Motivo de consulta</p>
                <p className="mt-1 font-semibold">
                  {caseData.handover.motivo}
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                <p className="text-sm text-[var(--text-tertiary)]">Tiempo de evolución</p>
                <p className="mt-1 font-semibold">
                  {caseData.handover.evolucion || "No informado"}
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                <p className="text-sm text-[var(--text-tertiary)]">
                  {isRedProtocol
                    ? "Señales críticas detectadas"
                    : "Señales detectadas"}
                </p>
                <p className="mt-1 font-semibold">
                  {caseData.handover.senalesDetectadas.length > 0
                    ? caseData.handover.senalesDetectadas.join(", ")
                    : "Sin señales rojas detectadas en este pre-triaje"}
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--surface-raised)] p-4">
                <p className="text-sm text-[var(--text-tertiary)]">Síntomas adicionales</p>
                <p className="mt-1 font-semibold">
                  {caseData.handover.sintomasAdicionales.length > 0
                    ? caseData.handover.sintomasAdicionales.join(", ")
                    : "No informados"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay-05)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
              Frontera no reemplaza una evaluación médica. Si estás frente a
              una emergencia, contactá a emergencias o dirigite a una guardia.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
