"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Priority } from "@/lib/triage";
import {
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

const priorityAccent: Record<
  Priority,
  { border: string; badgeBg: string; badgeText: string; dotBg: string; avatarBg: string; avatarText: string }
> = {
  ROJO: {
    border: "border-l-red-500",
    badgeBg: "bg-red-500/15",
    badgeText: "text-red-200",
    dotBg: "bg-red-500",
    avatarBg: "bg-red-500/15",
    avatarText: "text-red-100",
  },
  NARANJA: {
    border: "border-l-orange-500",
    badgeBg: "bg-orange-500/15",
    badgeText: "text-orange-200",
    dotBg: "bg-orange-500",
    avatarBg: "bg-orange-500/15",
    avatarText: "text-orange-100",
  },
  AMARILLO: {
    border: "border-l-yellow-400",
    badgeBg: "bg-yellow-400/15",
    badgeText: "text-yellow-200",
    dotBg: "bg-yellow-400",
    avatarBg: "bg-yellow-400/15",
    avatarText: "text-yellow-100",
  },
  VERDE: {
    border: "border-l-[#00C9A7]",
    badgeBg: "bg-[#00C9A7]/15",
    badgeText: "text-[#00C9A7]",
    dotBg: "bg-[#00C9A7]",
    avatarBg: "bg-[#00C9A7]/15",
    avatarText: "text-[#00C9A7]",
  },
  AZUL: {
    border: "border-l-sky-500",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-200",
    dotBg: "bg-sky-500",
    avatarBg: "bg-sky-500/15",
    avatarText: "text-sky-100",
  },
};

function getInitial(label: string) {
  return label.trim().charAt(0).toUpperCase() || "?";
}

function formatElapsed(createdAt: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - Date.parse(createdAt)) / 60000)
  );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} h ${remainingMinutes} min`;
}

// Cases attended more than this long ago drop out of the default "Todos"
// view so the board doesn't fill up with old resolved cases — full history
// stays one click away under the "Atendidos" filter. Uses createdAt (no
// dedicated "attended at" timestamp exists yet), so it's an approximation
// good enough for tidying the live view, not for medical-record timing.
const ARCHIVE_AFTER_HOURS = 24;

function isRecentlyAttended(item: TriageCase) {
  if (item.status !== "attended") {
    return true;
  }

  const hoursSinceCreated = (Date.now() - Date.parse(item.createdAt)) / 3600000;
  return hoursSinceCreated <= ARCHIVE_AFTER_HOURS;
}

function ClinicDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const tokenStorageKey = clinicSlug
    ? `frontera-clinic-token:${clinicSlug}`
    : "frontera-clinic-token";
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
  const [clinicName, setClinicName] = useState("");
  const isSuperAdminSession =
    typeof window !== "undefined" &&
    Boolean(token) &&
    sessionStorage.getItem("frontera-admin-session") === token;
  const [pickerClinics, setPickerClinics] = useState<
    Array<{ slug: string; name: string; isActive: boolean }>
  >([]);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<CaseFilter>("all");
  const knownCaseCodesRef = useRef<Set<string> | null>(null);

  const playNewCaseAlert = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio alert is a nice-to-have; ignore if the browser blocks it.
    }
  }, []);

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
    if (!token || !clinicSlug) {
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

      const nextCases: TriageCase[] = payload.cases;
      const nextCodes = new Set(nextCases.map((item) => item.caseCode));

      if (knownCaseCodesRef.current) {
        const hasNewCase = nextCases.some(
          (item) => !knownCaseCodesRef.current!.has(item.caseCode)
        );
        if (hasNewCase) {
          playNewCaseAlert();
        }
      }
      knownCaseCodesRef.current = nextCodes;

      setCases(sortTriageCases(nextCases));
    } catch {
      setMessage("No se pudieron cargar los casos.");
    } finally {
      setIsLoading(false);
    }
  }, [clinicSlug, token, playNewCaseAlert]);

  useEffect(() => {
    if (!isSuperAdminSession || clinicSlug) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setIsPickerLoading(true);
      fetch("/api/admin/clinics", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (active && payload?.clinics) {
            setPickerClinics(payload.clinics);
          }
        })
        .finally(() => {
          if (active) {
            setIsPickerLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isSuperAdminSession, clinicSlug, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCases();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCases]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const interval = window.setInterval(() => {
      loadCases();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [token, loadCases]);

  const priorityCounters = useMemo(() => {
    const active = cases.filter((item) => item.status !== "attended");
    return {
      rojo: active.filter((item) => item.priority === "ROJO" || item.priority === "NARANJA")
        .length,
      amarillo: active.filter((item) => item.priority === "AMARILLO").length,
      verde: active.filter((item) => item.priority === "VERDE" || item.priority === "AZUL")
        .length,
      attended: cases.filter((item) => item.status === "attended").length,
    };
  }, [cases]);

  const visibleCases = useMemo(() => {
    const sortedCases = sortTriageCases(cases);

    if (selectedFilter === "all") {
      return sortedCases.filter(isRecentlyAttended);
    }

    return sortedCases.filter((item) => item.status === selectedFilter);
  }, [cases, selectedFilter]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        router.replace(`/clinica/dashboard?clinic=${encodeURIComponent(realSlug)}`);
        return;
      }

      setToken(payload.clinicToken);
    } catch {
      setLoginError("No pudimos iniciar sesión.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071826] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={isSuperAdminSession ? "/admin/clinicas" : "/"}
              className="text-sm text-[#00C9A7]"
            >
              ← {isSuperAdminSession ? "Volver al panel de admin" : "Volver"}
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-tight">
              Casos en espera
            </h1>
            <p className="mt-2 text-slate-300">
              {clinicSlug
                ? clinicName || `Clínica: ${clinicSlug}`
                : "Elegí una clínica para ver sus casos"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
            Entrada QR: <span className="font-bold text-white">activa</span>
            {clinicSlug && (
              <Link
                href={`/clinica/qr?clinic=${encodeURIComponent(clinicSlug)}`}
                className="ml-3 font-bold text-[#00C9A7] underline-offset-4 hover:underline"
              >
                Ver QR de guardia
              </Link>
            )}
            {clinicSlug && (
              <Link
                href={`/clinica/equipo?clinic=${encodeURIComponent(clinicSlug)}`}
                className="ml-3 font-bold text-[#00C9A7] underline-offset-4 hover:underline"
              >
                Equipo
              </Link>
            )}
          </div>
        </header>

        {isSuperAdminSession && !clinicSlug && (
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-black">Elegí una clínica</h2>
            <p className="mt-2 text-sm text-slate-300">
              Estás con tu sesión de super admin — elegí a cuál clínica querés
              entrar.
            </p>

            {isPickerLoading && (
              <p className="mt-4 text-sm text-slate-300">Cargando clínicas...</p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {pickerClinics.map((clinic) => (
                <Link
                  key={clinic.slug}
                  href={`/clinica/dashboard?clinic=${encodeURIComponent(clinic.slug)}`}
                  className="rounded-2xl border border-white/10 bg-[#102638] p-4 transition hover:bg-white/10"
                >
                  <p className="font-bold">{clinic.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {clinic.isActive ? "Activa" : "Inactiva"}
                  </p>
                </Link>
              ))}
            </div>

            {!isPickerLoading && pickerClinics.length === 0 && (
              <p className="mt-4 text-sm text-slate-300">
                No hay clínicas creadas todavía.{" "}
                <Link href="/admin/clinicas" className="font-bold underline">
                  Crear una
                </Link>
              </p>
            )}
          </div>
        )}

        {!token && (
          <form
            onSubmit={handleLoginSubmit}
            className="mt-8 max-w-md rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
          >
            <label className="text-sm font-semibold text-slate-200">
              Usuario
            </label>
            <input
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#102638] p-4 text-white outline-none"
            />

            <label className="mt-4 block text-sm font-semibold text-slate-200">
              Contraseña
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#102638] p-4 text-white outline-none"
            />

            <button
              disabled={isLoggingIn}
              className="mt-4 w-full rounded-2xl bg-[#00C9A7] px-5 py-3 font-bold text-[#071826] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingIn ? "Entrando..." : "Entrar"}
            </button>

            {loginError && (
              <p className="mt-3 text-sm text-yellow-200">{loginError}</p>
            )}
          </form>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
            {message}
            {usingDemo ? " Mostrando datos demo de desarrollo." : ""}
          </div>
        )}

        {token && clinicSlug && (
          <div className="mt-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border-l-4 border-l-red-500 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Rojo</p>
                <p className="mt-1 text-2xl font-semibold">{priorityCounters.rojo}</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-yellow-400 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Amarillo</p>
                <p className="mt-1 text-2xl font-semibold">{priorityCounters.amarillo}</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-[#00C9A7] bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Verde</p>
                <p className="mt-1 text-2xl font-semibold">{priorityCounters.verde}</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-white/20 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Atendidos</p>
                <p className="mt-1 text-2xl font-semibold">{priorityCounters.attended}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedFilter(filter.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selectedFilter === filter.value
                        ? "border-[#00C9A7] bg-[#00C9A7] text-[#071826]"
                        : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
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

            {selectedFilter === "all" && priorityCounters.attended > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Los atendidos hace más de 24 h no se muestran acá — mirá la
                pestaña &quot;Atendidos&quot; para el historial completo.
              </p>
            )}
          </div>
        )}

        {isLoading && <p className="mt-8 text-slate-300">Cargando casos...</p>}

        <div className="mt-6 overflow-hidden rounded-lg border border-white/10">
          {visibleCases.length === 0 && !isLoading && token && clinicSlug && (
            <p className="p-5 text-sm text-slate-400">No hay casos para mostrar.</p>
          )}

          {visibleCases.map((item) => {
            const accent = priorityAccent[item.priority];

            return (
              <Link
                key={item.caseCode}
                href={`/clinica/casos/${item.caseCode}${
                  clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : ""
                }`}
                className={`flex items-center gap-4 border-b border-l-4 border-white/5 bg-white/[0.02] px-4 py-3 transition last:border-b-0 hover:bg-white/[0.06] ${accent.border}`}
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${accent.avatarBg} ${accent.avatarText}`}
                >
                  {getInitial(item.patientLabel)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.patientLabel}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${accent.badgeBg} ${accent.badgeText}`}
                    >
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-400">
                    {item.chiefComplaint}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-200">
                    {formatElapsed(item.createdAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {statusLabels[item.status]}
                  </p>
                </div>
              </Link>
            );
          })}
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
