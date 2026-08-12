"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  formatCaseDate,
  getCaseOriginLabel,
  statusLabels,
  type CaseStatus,
  type TriageCase,
} from "@/lib/triageCases";
import type { RedFlagAnswer } from "@/lib/triageConversation";

type PageProps = {
  params: Promise<{ caseCode: string }>;
};

function ClinicCaseDetailContent({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const tokenStorageKey = clinicSlug
    ? `frontera-clinic-token:${clinicSlug}`
    : "frontera-clinic-token";
  const dashboardHref = `/clinica/dashboard${
    clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : ""
  }`;
  const [caseCode, setCaseCode] = useState("");
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem(tokenStorageKey) ??
        sessionStorage.getItem("frontera-admin-session") ??
        ""
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
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
              ? "Token clínico inválido o ausente."
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

  async function handleLoginSubmit() {
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/clinic/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setLoginError(payload.error ?? "No pudimos iniciar sesión.");
        return;
      }

      const realSlug = payload.clinic.slug as string;
      sessionStorage.setItem(`frontera-clinic-token:${realSlug}`, payload.clinicToken);
      setPasswordInput("");

      if (realSlug !== clinicSlug) {
        router.replace(
          `/clinica/casos/${caseCode}?clinic=${encodeURIComponent(realSlug)}`
        );
        return;
      }

      setToken(payload.clinicToken);
    } catch {
      setLoginError("No pudimos iniciar sesión.");
    } finally {
      setIsLoggingIn(false);
    }
  }

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
            ? "Token clínico inválido o ausente."
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
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <Link href={dashboardHref} className="text-sm text-[#9df3e9]">
          ← Volver al dashboard
        </Link>

        <h1 className="mt-6 text-4xl font-black tracking-tight">
          Resumen del caso
        </h1>

        {!token && (
          <div className="mt-8 max-w-md rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <label className="text-sm font-semibold text-slate-200">
              Usuario
            </label>
            <input
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
            />

            <label className="mt-4 block text-sm font-semibold text-slate-200">
              Contraseña
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                autoComplete="current-password"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
              />
              <button
                type="button"
                disabled={isLoggingIn}
                onClick={handleLoginSubmit}
                className="rounded-2xl bg-[#52d6c4] px-5 py-3 font-bold text-[#071923] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoggingIn ? "Entrando..." : "Entrar"}
              </button>
            </div>
            {loginError && (
              <p className="mt-3 text-sm text-yellow-200">{loginError}</p>
            )}
          </div>
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
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
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
                  <p className="mt-2 text-sm font-semibold text-[#9df3e9]">
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
                    className="rounded-2xl bg-[#52d6c4] px-4 py-2 text-sm font-bold text-[#071923] disabled:cursor-not-allowed disabled:opacity-70"
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
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Prioridad</p>
                <p className="mt-1 font-semibold">
                  {caseData.priority} · {caseData.title}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Estado</p>
                <p className="mt-1 font-semibold">
                  {statusLabels[caseData.status]}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Origen</p>
                <p className="mt-1 font-semibold">
                  {getCaseOriginLabel(caseData)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Fecha y hora</p>
                <p className="mt-1 font-semibold">
                  {formatCaseDate(caseData.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Motivo</p>
                <p className="mt-1 font-semibold">
                  {caseData.chiefComplaint}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Obra social / prepaga</p>
                <p className="mt-1 font-semibold">
                  {conversationHandover?.obraSocial || "No informado"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Evolución</p>
                <p className="mt-1 font-semibold">
                  {caseData.evolution || "No informado"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Síntomas</p>
                <p className="mt-1 font-semibold">
                  {caseData.symptoms.length > 0
                    ? caseData.symptoms.join(", ")
                    : "No informados"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Señales detectadas</p>
                <p className="mt-1 font-semibold">
                  {caseData.redSignals.length > 0
                    ? caseData.redSignals.join(", ")
                    : "Sin señales rojas detectadas"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Recomendación</p>
                <p className="mt-1 font-semibold">
                  {caseData.recommendation}
                </p>
              </div>
              {conversationHandover?.patientContext && (
                <div className="rounded-2xl bg-[#0d2530] p-4">
                  <p className="text-sm text-slate-400">Completado para</p>
                  <p className="mt-1 font-semibold">
                    {conversationHandover.patientContext === "self"
                      ? "Para mí"
                      : "Para otra persona"}
                  </p>
                </div>
              )}
              {conversationHandover?.orientationIntent && (
                <div className="rounded-2xl border border-[#52d6c4]/30 bg-[#52d6c4]/10 p-4">
                  <p className="text-sm text-[#9df3e9]">
                    Orientación general
                  </p>
                  <p className="mt-1 font-semibold">
                    {conversationHandover.orientationMessage ||
                      "El paciente indicó que no sabía a dónde ir."}
                  </p>
                </div>
              )}
              {conversationHandover?.estimatedPriorityReason && (
                <div className="rounded-2xl bg-[#0d2530] p-4">
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
                  <div className="rounded-2xl bg-[#0d2530] p-4">
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
      </section>
    </main>
  );
}

export default function ClinicCaseDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <ClinicCaseDetailContent params={params} />
    </Suspense>
  );
}
