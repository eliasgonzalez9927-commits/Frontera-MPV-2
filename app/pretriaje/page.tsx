"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPriorityLabel, getSourceLabel, normalizeSource } from "@/lib/triage";
import {
  evolutionOptions,
  getEstimatedPriority,
  getEstimatedPriorityReason,
  getPositiveRedFlags,
  isUsefulChiefComplaint,
  redFlagQuestions,
  type PatientContext,
  type RedFlagAnswer,
  type RedFlagAnswerValue,
} from "@/lib/triageConversation";

const totalQuestions = 4 + redFlagQuestions.length;

function PreTriageWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = normalizeSource(searchParams.get("source"));
  const sourceLabel = getSourceLabel(source);
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const [clinicName, setClinicName] = useState("");
  const [step, setStep] = useState(0);
  const [patientContext, setPatientContext] = useState<PatientContext | "">("");
  const [motivo, setMotivo] = useState("");
  const [evolucion, setEvolucion] = useState("");
  const [intensidad, setIntensidad] = useState(5);
  const [redFlagAnswers, setRedFlagAnswers] = useState<
    Record<string, RedFlagAnswerValue>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clinicSlug) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      fetch(`/api/clinics/${clinicSlug}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (active && payload?.clinic?.name) {
            setClinicName(payload.clinic.name);
          }
        })
        .catch(() => {
          if (active) {
            setClinicName("");
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clinicSlug]);

  const answers: RedFlagAnswer[] = useMemo(
    () =>
      redFlagQuestions.map((item) => ({
        id: item.id,
        question: item.question,
        signal: item.signal,
        answer: redFlagAnswers[item.id] ?? "no",
      })),
    [redFlagAnswers]
  );
  const positiveRedFlags = getPositiveRedFlags(answers);
  const estimatedPriority = getEstimatedPriority(intensidad, answers);
  const estimatedPriorityReason = getEstimatedPriorityReason(
    estimatedPriority,
    intensidad
  );
  const headerTitle = clinicSlug
    ? `Pre-triaje de guardia${clinicName ? ` · ${clinicName}` : ""}`
    : "Pre-triaje Frontera";
  const questionNumber = step > 0 && step <= totalQuestions ? step : null;

  function goBack() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  function goNext() {
    setError("");

    if (step === 1 && !patientContext) {
      setError("Elegí si estás completando esto para vos o para otra persona.");
      return;
    }

    if (step === 2 && !isUsefulChiefComplaint(motivo)) {
      setError("Necesitamos una descripción más clara para poder orientarte.");
      return;
    }

    if (step === 3 && !evolucion) {
      setError("Elegí una opción para continuar.");
      return;
    }

    setStep((current) => Math.min(totalQuestions + 1, current + 1));
  }

  function setRedFlagAnswer(id: string, answer: RedFlagAnswerValue) {
    setRedFlagAnswers((current) => ({ ...current, [id]: answer }));
    setError("");
  }

  async function createCase() {
    if (isSubmitting) {
      return;
    }

    if (!isUsefulChiefComplaint(motivo)) {
      setError("Necesitamos una descripción más clara para poder orientarte.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/triage-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motivo: motivo.trim(),
          evolucion: evolucion || "No informado",
          intensidad,
          sintomas: positiveRedFlags,
          redFlags: positiveRedFlags,
          redFlagAnswers: answers,
          patientContext,
          estimatedPriorityReason,
          flowVersion: "conversation-v1",
          source,
          clinic: clinicSlug || undefined,
        }),
      });
      const payload = await response.json();

      if (response.ok && payload.caseCode) {
        router.push(`/pretriaje/resultado/${payload.caseCode}`);
        return;
      }

      throw new Error(payload.error ?? "No se pudo crear el caso.");
    } catch {
      setError("No pudimos crear el caso. Revisá la conexión e intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const redFlagStepIndex = step - 5;
  const currentRedFlag = redFlagQuestions[redFlagStepIndex];

  return (
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#9df3e9]">
          ← Volver
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-[#9df3e9]">{headerTitle}</p>
            <span className="rounded-full border border-[#52d6c4]/30 bg-[#52d6c4]/10 px-3 py-1 text-xs font-bold text-[#9df3e9]">
              {sourceLabel}
            </span>
          </div>

          {questionNumber && (
            <p className="mt-5 text-sm text-slate-400">
              Pregunta {questionNumber} de {totalQuestions}
            </p>
          )}

          {step === 0 && (
            <div className="mt-6">
              <h1 className="text-4xl font-black tracking-tight">
                Te vamos a hacer algunas preguntas rápidas, una por una.
              </h1>
              <p className="mt-4 text-slate-300">
                Frontera no diagnostica ni reemplaza al equipo médico. Si estás
                en una emergencia con riesgo inmediato, contactá emergencias o
                dirigite a una guardia.
              </p>
            </div>
          )}

          {step === 1 && (
            <QuestionBlock title="¿Estás completando esto para vos o para otra persona?">
              <ChoiceButton
                active={patientContext === "self"}
                onClick={() => setPatientContext("self")}
              >
                Para mí
              </ChoiceButton>
              <ChoiceButton
                active={patientContext === "other"}
                onClick={() => setPatientContext("other")}
              >
                Para otra persona
              </ChoiceButton>
            </QuestionBlock>
          )}

          {step === 2 && (
            <QuestionBlock title="¿Qué te está pasando ahora?">
              <textarea
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Ej: Me duele fuerte el abdomen desde hace unas horas..."
                className="min-h-36 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none ring-[#52d6c4]/40 placeholder:text-slate-500 focus:ring-4"
              />
            </QuestionBlock>
          )}

          {step === 3 && (
            <QuestionBlock title="¿Desde cuándo empezó?">
              {evolutionOptions.map((option) => (
                <ChoiceButton
                  key={option}
                  active={evolucion === option}
                  onClick={() => setEvolucion(option)}
                >
                  {option}
                </ChoiceButton>
              ))}
            </QuestionBlock>
          )}

          {step === 4 && (
            <QuestionBlock title="Del 1 al 10, ¿qué intensidad tiene?">
              <p className="text-5xl font-black text-[#52d6c4]">{intensidad}</p>
              <input
                type="range"
                min="1"
                max="10"
                value={intensidad}
                onChange={(event) => setIntensidad(Number(event.target.value))}
                className="mt-4 w-full"
              />
            </QuestionBlock>
          )}

          {currentRedFlag && (
            <QuestionBlock title={currentRedFlag.question}>
              {(["yes", "no", "unsure"] as RedFlagAnswerValue[]).map((answer) => (
                <ChoiceButton
                  key={answer}
                  active={redFlagAnswers[currentRedFlag.id] === answer}
                  onClick={() => setRedFlagAnswer(currentRedFlag.id, answer)}
                >
                  {answer === "yes"
                    ? "Sí"
                    : answer === "no"
                      ? "No"
                      : "No estoy seguro"}
                </ChoiceButton>
              ))}
              {positiveRedFlags.length > 0 && (
                <RedAlert>
                  Por lo que contás, esto puede requerir atención inmediata. No
                  esperes respuesta por este sistema. Contactá emergencias o
                  dirigite a una guardia ahora.
                </RedAlert>
              )}
            </QuestionBlock>
          )}

          {step === totalQuestions + 1 && (
            <div className="mt-6 space-y-4">
              <h1 className="text-3xl font-black">Resumen antes de crear el caso</h1>
              {estimatedPriority === "ROJO" && (
                <RedAlert>
                  Por lo que contás, esto puede requerir atención inmediata. No
                  esperes respuesta por este sistema. Contactá emergencias o
                  dirigite a una guardia ahora.
                </RedAlert>
              )}
              <SummaryItem label="Motivo" value={motivo} />
              <SummaryItem label="Tiempo de evolución" value={evolucion || "No informado"} />
              <SummaryItem label="Intensidad" value={`${intensidad}/10`} />
              <SummaryItem
                label="Señales rojas respondidas"
                value={
                  positiveRedFlags.length > 0
                    ? positiveRedFlags.join(", ")
                    : "Sin señales rojas confirmadas"
                }
              />
              <SummaryItem
                label="Prioridad estimada"
                value={`${estimatedPriority} · ${getPriorityLabel(estimatedPriority)}`}
              />
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-2xl border border-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Volver
              </button>
            )}

            {step < totalQuestions + 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-2xl bg-[#52d6c4] px-5 py-3 font-black text-[#071923]"
              >
                {step === 0 ? "Empezar" : "Continuar"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={createCase}
                className="rounded-2xl bg-[#52d6c4] px-5 py-3 font-black text-[#071923] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creando caso..." : "Crear pre-triaje"}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function QuestionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <h1 className="text-3xl font-black tracking-tight">{title}</h1>
      <div className="mt-6 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-5 py-4 text-left font-bold transition ${
        active
          ? "border-[#52d6c4] bg-[#52d6c4] text-[#071923]"
          : "border-white/10 bg-white/5 text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function RedAlert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-300/30 bg-red-500/15 p-4 text-sm font-semibold leading-6 text-red-100">
      {children}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#0d2530] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

export default function PreTriagePage() {
  return (
    <Suspense fallback={null}>
      <PreTriageWizard />
    </Suspense>
  );
}
