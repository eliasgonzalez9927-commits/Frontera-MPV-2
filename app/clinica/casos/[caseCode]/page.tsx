"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import {
  formatCaseDate,
  getCaseOriginLabel,
  statusLabels,
  type CaseStatus,
  type TriageCase,
} from "@/lib/triageCases";
import type { RedFlagAnswer } from "@/lib/triageConversation";
import { ClinicLoginForm } from "../../ClinicLoginForm";
import { useClinicSession } from "../../useClinicSession";

type PageProps = {
  params: Promise<{ caseCode: string }>;
};

function ClinicCaseDetailContent({ params }: PageProps) {
  const [caseCode, setCaseCode] = useState("");
  const {
    clinicSlug,
    token,
    usernameInput,
    setUsernameInput,
    passwordInput,
    setPasswordInput,
    isLoggingIn,
    loginError,
    handleLoginSubmit,
  } = useClinicSession(
    (slug) => `/clinica/casos/${caseCode}?clinic=${encodeURIComponent(slug)}`
  );
  const dashboardHref = `/clinica/dashboard${
    clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : ""
  }`;
  const [caseData, setCaseData] = useState<TriageCase | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const conversationHandover = caseData?.handover as
    | (TriageCase["handover"] & {
        patientContext?: string;
        redFlagAnswers?: RedFlagAnswer[];
        estimatedPriorityReason?: string;
        flowVersion?: string;
        entryMode?: string;
        obraSocial?: string;
        orientationIntent?: boolean;
        orientationMessage?: string;
      })
    | undefined;

  useEffect(() => {
    let active = true;

    async function resolveParams() {
      const resolved = await params;
      if (active) {
        setCaseCode(resolved.caseCode);
      }
    }

    resolveParams();

    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!token || !caseCode) {
      return;
    }

    let active = true;
    const clinicQuery = clinicSlug
      ? `?clinic=${encodeURIComponent(clinicSlug)}`
      : "";

    async function loadCase() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`/api/clinic/cases/${caseCode}${clinicQuery}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();

        if (!active) {
          return;
        }

        if (!response.ok) {
          setMessage(
            response.status === 401
              ? "Sesión inválida o vencida."
              : payload.error ?? "No se pudo cargar el caso."
          );
          return;
        }

        setCaseData(payload.case);
      } catch {
        if (active) {
          setMessage("No se pudo cargar el caso.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCase();

    return () => {
      active = false;
    };
  }, [token, caseCode, clinicSlug]);

  async function updateStatus(status: CaseStatus) {
    setMessage("");
    setIsUpdating(true);

    const clinicQuery = clinicSlug
      ? `?clinic=${encodeURIComponent(clinicSlug)}`
      : "";

    try {
      const response = await fetch(`/api/clinic/cases/${caseCode}${clinicQuery}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(
          response.status === 401
            ? "Sesión inválida o vencida."
            : payload.error ?? "No se pudo actualizar el estado."
        );
        return;
      }

      setCaseData(payload.case);
    } catch {
      setMessage("No se pudo actualizar el estado.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Resumen del caso</h1>

      {!token && (
        <ClinicLoginForm
          usernameInput={usernameInput}
          onUsernameChange={setUsernameInput}
          passwordInput={passwordInput}
          onPasswordChange={setPasswordInput}
          isLoggingIn={isLoggingIn}
          loginError={loginError}
          onSubmit={handleLoginSubmit}
        />
      )}

      {message && (
        <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
          {message}{" "}
          <Link href={dashboardHref} className="font-bold underline">
            Volver al dashboard
          </Link>
        </div>
      )}

      {isLoading && <p className="mt-8 text-slate-300">Cargando caso...</p>}

      {caseData && (
        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <div>
              <p className="text-sm text-slate-400">Paciente</p>
              <p className="mt-1 text-2xl font-black">
                {caseData.patientLabel}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Código de caso: <span className="font-semibold text-white">{caseData.caseCode}</span>
              </p>
              {caseData.clinicName && (
                <p className="mt-2 text-sm font-semibold text-[#00C9A7]">
                  {caseData.clinicName}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {caseData.status === "waiting" && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateStatus("in_review")}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Marcar en revisión
                </button>
              )}

              {caseData.status === "in_review" && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updateStatus("attended")}
                  className="rounded-2xl bg-[#00C9A7] px-4 py-2 text-sm font-bold text-[#071826] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Marcar atendido
                </button>
              )}

              {caseData.status === "attended" && (
                <div className="rounded-2xl border border-green-300/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-100">
                  Caso cerrado / Atendido
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Prioridad</p>
              <p className="mt-1 font-semibold">
                {caseData.priority} · {caseData.title}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Estado</p>
              <p className="mt-1 font-semibold">
                {statusLabels[caseData.status]}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Origen</p>
              <p className="mt-1 font-semibold">
                {getCaseOriginLabel(caseData)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Fecha y hora</p>
              <p className="mt-1 font-semibold">
                {formatCaseDate(caseData.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Motivo</p>
              <p className="mt-1 font-semibold">
                {caseData.chiefComplaint}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Obra social / prepaga</p>
              <p className="mt-1 font-semibold">
                {conversationHandover?.obraSocial || "No informado"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Evolución</p>
              <p className="mt-1 font-semibold">
                {caseData.evolution || "No informado"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Síntomas</p>
              <p className="mt-1 font-semibold">
                {caseData.symptoms.length > 0
                  ? caseData.symptoms.join(", ")
                  : "No informados"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Señales detectadas</p>
              <p className="mt-1 font-semibold">
                {caseData.redSignals.length > 0
                  ? caseData.redSignals.join(", ")
                  : "Sin señales rojas detectadas"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#102638] p-4">
              <p className="text-sm text-slate-400">Recomendación</p>
              <p className="mt-1 font-semibold">
                {caseData.recommendation}
              </p>
            </div>
            {conversationHandover?.patientContext && (
              <div className="rounded-2xl bg-[#102638] p-4">
                <p className="text-sm text-slate-400">Completado para</p>
                <p className="mt-1 font-semibold">
                  {conversationHandover.patientContext === "self"
                    ? "Para mí"
                    : "Para otra persona"}
                </p>
              </div>
            )}
            {conversationHandover?.orientationIntent && (
              <div className="rounded-2xl border border-[#00C9A7]/30 bg-[#00C9A7]/10 p-4">
                <p className="text-sm text-[#00C9A7]">
                  Orientación general
                </p>
                <p className="mt-1 font-semibold">
                  {conversationHandover.orientationMessage ||
                    "El paciente indicó que no sabía a dónde ir."}
                </p>
              </div>
            )}
            {conversationHandover?.estimatedPriorityReason && (
              <div className="rounded-2xl bg-[#102638] p-4">
                <p className="text-sm text-slate-400">
                  Motivo de prioridad estimada
                </p>
                <p className="mt-1 font-semibold">
                  {conversationHandover.estimatedPriorityReason}
                </p>
              </div>
            )}
            {conversationHandover?.redFlagAnswers &&
              conversationHandover.redFlagAnswers.length > 0 && (
                <div className="rounded-2xl bg-[#102638] p-4">
                  <p className="text-sm text-slate-400">
                    Respuestas de señales rojas
                  </p>
                  <div className="mt-3 space-y-2">
                    {conversationHandover.redFlagAnswers.map((answer) => (
                      <p key={answer.id} className="text-sm">
                        <span className="text-slate-300">
                          {answer.question}
                        </span>{" "}
                        <span className="font-bold text-white">
                          {answer.answer === "yes"
                            ? "Sí"
                            : answer.answer === "no"
                              ? "No"
                              : "No estoy seguro"}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </>
  );
}

export default function ClinicCaseDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <ClinicCaseDetailContent params={params} />
    </Suspense>
  );
}
