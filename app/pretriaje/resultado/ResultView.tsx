"use client";

import Link from "next/link";
import type { TriageResult, Priority } from "@/lib/triage";
import { getPriorityLabel } from "@/lib/triage";

const EMERGENCY_PHONE_HREF = "tel:107";

type ResultViewProps = {
  caseData: TriageResult;
  notice?: string;
};

function priorityClass(priority: Priority) {
  const classes: Record<Priority, string> = {
    ROJO: "border-red-300/40 bg-red-500/20 text-red-100",
    NARANJA: "border-orange-300/40 bg-orange-500/20 text-orange-100",
    AMARILLO: "border-yellow-300/40 bg-yellow-500/20 text-yellow-100",
    VERDE: "border-green-300/40 bg-green-500/20 text-green-100",
    AZUL: "border-sky-300/40 bg-sky-500/20 text-sky-100",
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

  return (
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <Link href="/pretriaje" className="text-sm text-[#9df3e9]">
          ← Nuevo pre-triaje
        </Link>

        {notice && (
          <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
            {notice}
          </div>
        )}

        {isRedProtocol && (
          <section className="mt-8 rounded-[2rem] border border-red-300/50 bg-red-500/20 p-6 shadow-2xl shadow-red-950/30">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-100">
              Protocolo Rojo
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-red-50">
              Posible emergencia
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-7 text-red-50/90">
              Por lo que contás, podrías necesitar atención inmediata. No
              esperes a completar más pasos si los síntomas continúan o
              empeoran.
            </p>
            <p className="mt-3 text-sm font-semibold text-red-50/80">
              Frontera no reemplaza a emergencias.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={EMERGENCY_PHONE_HREF}
                className="rounded-2xl bg-red-50 px-5 py-3 text-center font-black text-red-950 transition hover:bg-white"
              >
                Llamar emergencias
              </a>
              <button
                type="button"
                className="rounded-2xl border border-red-100/40 px-5 py-3 font-black text-red-50 transition hover:bg-red-50/10"
              >
                Ir a guardia ahora
              </button>
            </div>
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

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-[#9df3e9]">
              Resumen para el equipo médico
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#52d6c4]/30 bg-[#52d6c4]/10 p-4">
                <p className="text-sm text-[#9df3e9]">Pase Digital Frontera</p>
                <p className="mt-1 text-3xl font-black tracking-wide text-white">
                  {caseData.caseCode}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Presentá este código al llegar a admisión o enfermería.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#0d2530] p-4">
                  <p className="text-sm text-slate-400">Prioridad estimada</p>
                  <p className="mt-1 font-semibold">
                    {caseData.priority} · {getPriorityLabel(caseData.priority)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#0d2530] p-4">
                  <p className="text-sm text-slate-400">Origen</p>
                  <p className="mt-1 font-semibold">{caseData.sourceLabel}</p>
                </div>

                <div className="rounded-2xl bg-[#0d2530] p-4">
                  <p className="text-sm text-slate-400">Fecha y hora</p>
                  <p className="mt-1 font-semibold">{createdAt}</p>
                </div>

                <div className="rounded-2xl bg-[#0d2530] p-4">
                  <p className="text-sm text-slate-400">Paciente</p>
                  <p className="mt-1 font-semibold">
                    {caseData.patientLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Motivo de consulta</p>
                <p className="mt-1 font-semibold">
                  {caseData.handover.motivo}
                </p>
              </div>

              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Tiempo de evolución</p>
                <p className="mt-1 font-semibold">
                  {caseData.handover.evolucion || "No informado"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">
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

              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Síntomas adicionales</p>
                <p className="mt-1 font-semibold">
                  {caseData.handover.sintomasAdicionales.length > 0
                    ? caseData.handover.sintomasAdicionales.join(", ")
                    : "No informados"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
              Frontera no reemplaza una evaluación médica. Si estás frente a
              una emergencia, contactá a emergencias o dirigite a una guardia.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
