"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Priority } from "@/lib/triage";
import { priorityRank } from "@/lib/triage";
import type { TriageCase } from "@/lib/triageCases";

const demoCases = [
  {
    caseCode: "FR-DEMO-ROJO",
    patientLabel: "Paciente sin identificar",
    chiefComplaint: "Dolor de pecho y falta de aire",
    priority: "ROJO" as Priority,
    sourceLabel: "Entrada QR de guardia",
    status: "waiting",
    createdAt: new Date().toISOString(),
    recommendation: "Requiere intervención inmediata.",
    handover: {
      motivo: "Dolor de pecho y falta de aire",
      prioridad: "ROJO" as Priority,
      senalesDetectadas: ["dolor de pecho", "me cuesta respirar"],
      sintomasAdicionales: ["dolor de pecho", "me cuesta respirar"],
    },
  },
  {
    caseCode: "FR-DEMO-AMARILLO",
    patientLabel: "Paciente web",
    chiefComplaint: "Fiebre y vómitos desde anoche",
    priority: "AMARILLO" as Priority,
    sourceLabel: "Entrada web",
    status: "waiting",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    recommendation: "Recomendamos evaluación médica hoy.",
    handover: {
      motivo: "Fiebre y vómitos desde anoche",
      prioridad: "AMARILLO" as Priority,
      senalesDetectadas: [],
      sintomasAdicionales: ["fiebre", "vómitos"],
    },
  },
].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

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
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes} hs`;
}

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

export default function ClinicDashboardPage() {
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem("frontera-clinic-token") ?? ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    async function loadCases() {
      setIsLoading(true);
      setMessage("");
      setUsingDemo(false);

      try {
        const response = await fetch("/api/clinic/cases", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();

        if (!active) {
          return;
        }

        if (!response.ok) {
          if (response.status === 503) {
            setCases(demoCases as TriageCase[]);
            setUsingDemo(true);
          }
          setMessage(payload.error ?? "No se pudieron cargar los casos.");
          return;
        }

        setCases(payload.cases);
      } catch {
        if (active) {
          setMessage("No se pudieron cargar los casos.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCases();

    return () => {
      active = false;
    };
  }, [token]);

  function handleTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenInput.trim();
    sessionStorage.setItem("frontera-clinic-token", nextToken);
    setToken(nextToken);
  }

  return (
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link href="/" className="text-sm text-[#9df3e9]">
              ← Volver
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-tight">
              Casos en espera
            </h1>
            <p className="mt-2 text-slate-300">
              Vista de casos en espera, ordenados por prioridad de urgencia.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
            Entrada QR: <span className="font-bold text-white">activa</span>
          </div>
        </header>

        {!token && (
          <form
            onSubmit={handleTokenSubmit}
            className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
          >
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
              <button className="rounded-2xl bg-[#52d6c4] px-5 py-3 font-bold text-[#071923]">
                Entrar
              </button>
            </div>
          </form>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
            {message}
            {usingDemo ? " Mostrando datos demo de desarrollo." : ""}
          </div>
        )}

        {isLoading && <p className="mt-8 text-slate-300">Cargando casos...</p>}

        <div className="mt-8 grid gap-4">
          {cases.map((item) => (
            <article
              key={item.caseCode}
              className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 md:grid-cols-[160px_1fr_170px]"
            >
              <div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${priorityClass(
                    item.priority
                  )}`}
                >
                  {item.priority}
                </span>
                <p className="mt-3 text-sm text-slate-400">
                  {formatCaseDate(item.createdAt)}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {formatStatus(item.status)}
                </p>
              </div>

              <div>
                <h2 className="text-xl font-black">{item.chiefComplaint}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {item.patientLabel}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#9df3e9]">
                  Origen: {item.sourceLabel}
                </p>
                <p className="mt-3 text-slate-300">{item.recommendation}</p>
              </div>

              <div className="flex items-start justify-end">
                <Link
                  href={`/clinica/casos/${item.caseCode}`}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Ver resumen
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
