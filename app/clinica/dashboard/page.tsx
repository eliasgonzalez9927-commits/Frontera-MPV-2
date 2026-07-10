"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import type { Priority } from "@/lib/triage";
import {
  formatCaseTime,
  sortTriageCases,
  statusLabels,
  type CaseStatus,
  type TriageCase,
} from "@/lib/triageCases";

type CaseFilter = "all" | CaseStatus;

const demoCases: TriageCase[] = [
  {
    id: "FR-DEMO-ROJO",
    caseCode: "FR-DEMO-ROJO",
    patientLabel: "Paciente sin identificar",
    chiefComplaint: "Dolor de pecho y falta de aire",
    priority: "ROJO" as Priority,
    title: "Emergencia",
    source: "qr",
    sourceLabel: "Entrada QR de guardia",
    status: "waiting" as CaseStatus,
    createdAt: new Date().toISOString(),
    recommendation: "Requiere intervención inmediata.",
    redSignals: ["dolor de pecho", "me cuesta respirar"],
    symptoms: ["dolor de pecho", "me cuesta respirar"],
    handover: {
      motivo: "Dolor de pecho y falta de aire",
      prioridad: "ROJO" as Priority,
      senalesDetectadas: ["dolor de pecho", "me cuesta respirar"],
      sintomasAdicionales: ["dolor de pecho", "me cuesta respirar"],
    },
  },
  {
    id: "FR-DEMO-AMARILLO",
    caseCode: "FR-DEMO-AMARILLO",
    patientLabel: "Paciente web",
    chiefComplaint: "Fiebre y vómitos desde anoche",
    priority: "AMARILLO" as Priority,
    title: "Urgente",
    source: "web",
    sourceLabel: "Entrada web",
    status: "waiting" as CaseStatus,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    recommendation: "Recomendamos evaluación médica hoy.",
    redSignals: [],
    symptoms: ["fiebre", "vómitos"],
    handover: {
      motivo: "Fiebre y vómitos desde anoche",
      prioridad: "AMARILLO" as Priority,
      senalesDetectadas: [],
      sintomasAdicionales: ["fiebre", "vómitos"],
    },
  },
];

const filters: { value: CaseFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "waiting", label: "En espera" },
  { value: "in_review", label: "En revisión" },
  { value: "attended", label: "Atendidos" },
];

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

function ClinicDashboardContent() {
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const tokenStorageKey = clinicSlug
    ? `frontera-clinic-token:${clinicSlug}`
    : "frontera-clinic-token";
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem(tokenStorageKey) ?? ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<CaseFilter>("all");

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

  const loadCases = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setUsingDemo(false);

    const query = clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : "";

    try {
      const response = await fetch(`/api/clinic/cases${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 503) {
          setCases(sortTriageCases(demoCases));
          setUsingDemo(true);
        }
        setMessage(payload.error ?? "No se pudieron cargar los casos.");
        return;
      }

      setCases(sortTriageCases(payload.cases));
    } catch {
      setMessage("No se pudieron cargar los casos.");
    } finally {
      setIsLoading(false);
    }
  }, [clinicSlug, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCases();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCases]);

  const counters = useMemo(
    () => ({
      waiting: cases.filter((item) => item.status === "waiting").length,
      in_review: cases.filter((item) => item.status === "in_review").length,
      attended: cases.filter((item) => item.status === "attended").length,
    }),
    [cases]
  );

  const visibleCases = useMemo(() => {
    const sortedCases = sortTriageCases(cases);

    if (selectedFilter === "all") {
      return sortedCases;
    }

    return sortedCases.filter((item) => item.status === selectedFilter);
  }, [cases, selectedFilter]);

  function handleTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenInput.trim();
    sessionStorage.setItem(tokenStorageKey, nextToken);
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
              {clinicSlug
                ? clinicName || `Clínica: ${clinicSlug}`
                : "Vista general de casos en espera"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
            Entrada QR: <span className="font-bold text-white">activa</span>
            {clinicSlug && (
              <Link
                href={`/clinica/qr?clinic=${encodeURIComponent(clinicSlug)}`}
                className="ml-3 font-bold text-[#9df3e9] underline-offset-4 hover:underline"
              >
                Ver QR de guardia
              </Link>
            )}
          </div>
        </header>

        {!token && (
          <form
            onSubmit={handleTokenSubmit}
            className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
          >
            <label className="text-sm font-semibold text-slate-200">
              {clinicSlug
                ? "Token temporal de esta clínica"
                : "Token temporal de clínica"}
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

        {token && (
          <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <span>En espera: {counters.waiting}</span>
                <span>En revisión: {counters.in_review}</span>
                <span>Atendidos: {counters.attended}</span>
              </div>
              <button
                type="button"
                onClick={loadCases}
                disabled={isLoading}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Actualizar casos
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSelectedFilter(filter.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedFilter === filter.value
                      ? "border-[#52d6c4] bg-[#52d6c4] text-[#071923]"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && <p className="mt-8 text-slate-300">Cargando casos...</p>}

        <div className="mt-8 grid gap-4">
          {visibleCases.map((item) => (
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
                  {formatCaseTime(item.createdAt)}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {statusLabels[item.status]}
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
                  href={`/clinica/casos/${item.caseCode}${
                    clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : ""
                  }`}
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

export default function ClinicDashboardPage() {
  return (
    <Suspense fallback={null}>
      <ClinicDashboardContent />
    </Suspense>
  );
}
