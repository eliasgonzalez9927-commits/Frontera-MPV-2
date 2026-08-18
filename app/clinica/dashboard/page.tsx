"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Priority } from "@/lib/triage";
import {
  sortTriageCases,
  statusLabels,
  type CaseStatus,
  type TriageCase,
} from "@/lib/triageCases";
import { ClinicLoginForm } from "../ClinicLoginForm";
import { useClinicSession } from "../useClinicSession";

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
  { border: string; badgeBg: string; badgeText: string; avatarBg: string; avatarText: string }
> = {
  ROJO: {
    border: "border-l-[var(--status-danger-border)]",
    badgeBg: "bg-[var(--status-danger-bg)]",
    badgeText: "text-[var(--status-danger-text)]",
    avatarBg: "bg-[var(--status-danger-bg)]",
    avatarText: "text-[var(--status-danger-text)]",
  },
  NARANJA: {
    border: "border-l-[var(--status-caution-border)]",
    badgeBg: "bg-[var(--status-caution-bg)]",
    badgeText: "text-[var(--status-caution-text)]",
    avatarBg: "bg-[var(--status-caution-bg)]",
    avatarText: "text-[var(--status-caution-text)]",
  },
  AMARILLO: {
    border: "border-l-[var(--status-warning-border)]",
    badgeBg: "bg-[var(--status-warning-bg)]",
    badgeText: "text-[var(--status-warning-text)]",
    avatarBg: "bg-[var(--status-warning-bg)]",
    avatarText: "text-[var(--status-warning-text)]",
  },
  VERDE: {
    border: "border-l-[#00C9A7]",
    badgeBg: "bg-[#00C9A7]/15",
    badgeText: "text-[var(--accent-text)]",
    avatarBg: "bg-[#00C9A7]/15",
    avatarText: "text-[var(--accent-text)]",
  },
  AZUL: {
    border: "border-l-[var(--status-info-border)]",
    badgeBg: "bg-[var(--status-info-bg)]",
    badgeText: "text-[var(--status-info-text)]",
    avatarBg: "bg-[var(--status-info-bg)]",
    avatarText: "text-[var(--status-info-text)]",
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
  const {
    clinicSlug,
    token,
    isSuperAdminSession,
    usernameInput,
    setUsernameInput,
    passwordInput,
    setPasswordInput,
    isLoggingIn,
    loginError,
    handleLoginSubmit,
  } = useClinicSession((slug) => `/clinica/dashboard?clinic=${encodeURIComponent(slug)}`);

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

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Casos en espera</h1>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">
        {clinicSlug ? "" : "Elegí una clínica para ver sus casos."}
      </p>

      {isSuperAdminSession && !clinicSlug && (
        <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-overlay-05)] p-5">
          <h2 className="text-xl font-black">Elegí una clínica</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Estás con tu sesión de super admin — elegí a cuál clínica querés
            entrar.
          </p>

          {isPickerLoading && (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Cargando clínicas...</p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pickerClinics.map((clinic) => (
              <Link
                key={clinic.slug}
                href={`/clinica/dashboard?clinic=${encodeURIComponent(clinic.slug)}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 transition hover:bg-[var(--surface-overlay-10)]"
              >
                <p className="font-bold">{clinic.name}</p>
                <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                  {clinic.isActive ? "Activa" : "Inactiva"}
                </p>
              </Link>
            ))}
          </div>

          {!isPickerLoading && pickerClinics.length === 0 && (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              No hay clínicas creadas todavía.{" "}
              <Link href="/admin/clinicas" className="font-bold underline">
                Crear una
              </Link>
            </p>
          )}
        </div>
      )}

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
        <div className="mt-6 rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 text-sm text-[var(--status-warning-text)]">
          {message}
          {usingDemo ? " Mostrando datos demo de desarrollo." : ""}
        </div>
      )}

      {token && clinicSlug && (
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border-l-4 border-l-[var(--status-danger-border)] bg-[var(--surface-overlay-05)] px-4 py-3">
              <p className="text-xs text-[var(--text-tertiary)]">Rojo</p>
              <p className="mt-1 text-2xl font-semibold">{priorityCounters.rojo}</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-[var(--status-warning-border)] bg-[var(--surface-overlay-05)] px-4 py-3">
              <p className="text-xs text-[var(--text-tertiary)]">Amarillo</p>
              <p className="mt-1 text-2xl font-semibold">{priorityCounters.amarillo}</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-[#00C9A7] bg-[var(--surface-overlay-05)] px-4 py-3">
              <p className="text-xs text-[var(--text-tertiary)]">Verde</p>
              <p className="mt-1 text-2xl font-semibold">{priorityCounters.verde}</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-[var(--border-strong)] bg-[var(--surface-overlay-05)] px-4 py-3">
              <p className="text-xs text-[var(--text-tertiary)]">Atendidos</p>
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
                      ? "border-[#00C9A7] bg-[#00C9A7] text-[var(--accent-contrast)]"
                      : "border-[var(--border)] bg-[var(--surface-overlay-05)] text-[var(--text-secondary)] hover:bg-[var(--surface-overlay-10)]"
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
              className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text)] transition hover:bg-[var(--surface-overlay-10)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Actualizar casos
            </button>
          </div>

          {selectedFilter === "all" && priorityCounters.attended > 0 && (
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              Los atendidos hace más de 24 h no se muestran acá — mirá la
              pestaña &quot;Atendidos&quot; para el historial completo.
            </p>
          )}
        </div>
      )}

      {isLoading && <p className="mt-8 text-[var(--text-secondary)]">Cargando casos...</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-[var(--border)]">
        {visibleCases.length === 0 && !isLoading && token && clinicSlug && (
          <p className="p-5 text-sm text-[var(--text-tertiary)]">No hay casos para mostrar.</p>
        )}

        {visibleCases.map((item) => {
          const accent = priorityAccent[item.priority];

          return (
            <Link
              key={item.caseCode}
              href={`/clinica/casos/${item.caseCode}${
                clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : ""
              }`}
              className={`flex items-center gap-4 border-b border-l-4 border-[var(--border-soft)] bg-[var(--surface-overlay-02)] px-4 py-3 transition last:border-b-0 hover:bg-[var(--surface-overlay-06)] ${accent.border}`}
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
                <p className="mt-0.5 truncate text-sm text-[var(--text-tertiary)]">
                  {item.chiefComplaint}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">
                  {formatElapsed(item.createdAt)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  {statusLabels[item.status]}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default function ClinicDashboardPage() {
  return (
    <Suspense fallback={null}>
      <ClinicDashboardContent />
    </Suspense>
  );
}
