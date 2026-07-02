"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TriageCase, CaseStatus } from "@/lib/triageCases";

type PageProps = {
  params: Promise<{ caseCode: string }>;
};

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    waiting: "En espera",
    in_review: "En revisión",
    attended: "Atendido",
  };

  return labels[status] ?? status;
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

export default function ClinicCaseDetailPage({ params }: PageProps) {
  const [caseCode, setCaseCode] = useState("");
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem("frontera-clinic-token") ?? ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [caseData, setCaseData] = useState<TriageCase | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    async function loadCase() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch(`/api/clinic/cases/${caseCode}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();

        if (!active) {
          return;
        }

        if (!response.ok) {
          setMessage(payload.error ?? "No se pudo cargar el caso.");
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
  }, [token, caseCode]);

  function saveToken() {
    const nextToken = tokenInput.trim();
    sessionStorage.setItem("frontera-clinic-token", nextToken);
    setToken(nextToken);
  }

  async function updateStatus(status: CaseStatus) {
    setMessage("");

    try {
      const response = await fetch(`/api/clinic/cases/${caseCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo actualizar el estado.");
        return;
      }

      setCaseData(payload.case);
    } catch {
      setMessage("No se pudo actualizar el estado.");
    }
  }

  return (
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <Link href="/clinica/dashboard" className="text-sm text-[#9df3e9]">
          ← Volver al dashboard
        </Link>

        <h1 className="mt-6 text-4xl font-black tracking-tight">
          Resumen del caso
        </h1>

        {!token && (
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <label className="text-sm font-semibold text-slate-200">
              Token temporal de clínica
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none"
              />
              <button
                type="button"
                onClick={saveToken}
                className="rounded-2xl bg-[#52d6c4] px-5 py-3 font-bold text-[#071923]"
              >
                Entrar
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
            {message}
          </div>
        )}

        {isLoading && <p className="mt-8 text-slate-300">Cargando caso...</p>}

        {caseData && (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <p className="text-sm text-slate-400">Código de caso</p>
                <p className="mt-1 text-2xl font-black">
                  {caseData.caseCode}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateStatus("in_review")}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Marcar en revisión
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus("attended")}
                  className="rounded-2xl bg-[#52d6c4] px-4 py-2 text-sm font-bold text-[#071923]"
                >
                  Marcar atendido
                </button>
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
                  {formatStatus(caseData.status)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#0d2530] p-4">
                <p className="text-sm text-slate-400">Origen</p>
                <p className="mt-1 font-semibold">{caseData.sourceLabel}</p>
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
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
