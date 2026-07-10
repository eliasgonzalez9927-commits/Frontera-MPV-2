"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSourceLabel, normalizeSource } from "@/lib/triage";

const symptomOptions = [
  "fiebre",
  "vómitos",
  "sangrado",
  "mareo",
  "dolor de pecho",
  "me cuesta respirar",
  "golpe o trauma",
];

function PreTriageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = normalizeSource(searchParams.get("source"));
  const sourceLabel = getSourceLabel(source);
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const [motivo, setMotivo] = useState("");
  const [evolucion, setEvolucion] = useState("");
  const [intensidad, setIntensidad] = useState(5);
  const [sintomas, setSintomas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [clinicName, setClinicName] = useState("");

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

  function toggleSymptom(symptom: string) {
    setSintomas((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedMotivo = motivo.trim();

    if (!trimmedMotivo) {
      setError("El motivo de consulta es obligatorio.");
      return;
    }

    if (trimmedMotivo.length < 10) {
      setError("Contanos el motivo con al menos 10 caracteres.");
      return;
    }

    if (intensidad < 1 || intensidad > 10) {
      setError("La intensidad debe estar entre 1 y 10.");
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
          motivo: trimmedMotivo,
          evolucion: evolucion.trim(),
          intensidad,
          sintomas,
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

  return (
    <main className="min-h-screen bg-[#071923] px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#9df3e9]">
          ← Volver
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-[#9df3e9]">
              Pre-triaje público
            </p>
            <span className="rounded-full border border-[#52d6c4]/30 bg-[#52d6c4]/10 px-3 py-1 text-xs font-bold text-[#9df3e9]">
              {clinicName ? `${sourceLabel} · ${clinicName}` : sourceLabel}
            </span>
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Contanos qué te está pasando ahora.
          </h1>

          <p className="mt-4 text-slate-300">
            Este flujo ayuda a estimar prioridad y preparar un resumen para el
            equipo médico. No reemplaza una evaluación médica.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-200">
                Motivo de consulta
              </label>
              <textarea
                required
                minLength={10}
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Ej: Me duele mucho la panza desde hace 4 horas..."
                className="mt-2 min-h-36 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none ring-[#52d6c4]/40 placeholder:text-slate-500 focus:ring-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-200">
                ¿Desde cuándo empezó?
              </label>
              <input
                value={evolucion}
                onChange={(event) => setEvolucion(event.target.value)}
                placeholder="Ej: hace 2 horas, desde ayer, recién..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d2530] p-4 text-white outline-none ring-[#52d6c4]/40 placeholder:text-slate-500 focus:ring-4"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-200">
                Intensidad del síntoma principal: {intensidad}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensidad}
                onChange={(event) => setIntensidad(Number(event.target.value))}
                className="mt-3 w-full"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                ¿Aparece algo de esto?
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {symptomOptions.map((symptom) => {
                  const active = sintomas.includes(symptom);

                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        active
                          ? "border-[#52d6c4] bg-[#52d6c4] text-[#071923]"
                          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      {symptom}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
              Si tenés dolor de pecho intenso, falta de aire severa, pérdida de
              conocimiento, convulsiones, sangrado abundante o riesgo vital,
              contactá emergencias o dirigite a una guardia.
            </div>

            {error && (
              <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#52d6c4] px-6 py-4 font-black text-[#071923] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creando caso..." : "Evaluar urgencia"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function PreTriagePage() {
  return (
    <Suspense fallback={null}>
      <PreTriageForm />
    </Suspense>
  );
}
