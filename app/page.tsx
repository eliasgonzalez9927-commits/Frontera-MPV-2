import Link from "next/link";
import { buildGeneralWhatsappUrl } from "@/lib/whatsappLink";

const stats = [
  {
    value: "84,5%",
    label: "de consultas en guardia son de bajo riesgo",
  },
  {
    value: "2,6%",
    label: "son emergencias vitales reales",
  },
  {
    value: "QR + Web",
    label: "entrada online y en sala de espera",
  },
];

export default function Home() {
  const whatsappUrl = buildGeneralWhatsappUrl();

  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--text)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-brand text-xl font-bold tracking-tight">
              FRON<span className="text-[var(--accent-text)]">TERA</span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Pre-triaje digital</p>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#00C9A7]/30 bg-[#00C9A7]/10 px-4 py-2 text-sm text-[var(--accent-text)]">
              Hablá con Frontera por WhatsApp
            </div>

            <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              Pre-triaje digital para urgencias.
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-8 text-[var(--text-secondary)]">
              Orientamos la prioridad del caso y generamos un resumen para el
              equipo médico antes de ocupar una guardia.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-[#00C9A7] px-6 py-4 text-center font-bold text-[var(--accent-contrast)] transition hover:scale-[1.02]"
              >
                Iniciar pre-triaje por WhatsApp
              </a>

              <Link
                href="/pretriaje"
                className="px-2 py-3 text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 transition hover:text-[var(--text)] hover:underline"
              >
                Prefiero hacerlo por web
              </Link>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--text-tertiary)]">
              Frontera no reemplaza una evaluación médica. Si estás frente a una
              emergencia, contactá a emergencias o dirigite a una guardia.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-overlay-05)] p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="rounded-[1.5rem] bg-[var(--surface-raised)] p-5">
              <p className="text-sm font-semibold text-[var(--accent-text)]">
                Caso simulado
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-[var(--surface-overlay-08)] p-4">
                  <p className="text-sm text-[var(--text-tertiary)]">Paciente</p>
                  <p className="mt-1 font-semibold">Paciente sin identificar</p>
                </div>

                <div className="rounded-2xl bg-[var(--surface-overlay-08)] p-4">
                  <p className="text-sm text-[var(--text-tertiary)]">Motivo</p>
                  <p className="mt-1 font-semibold">
                    Dolor abdominal hace 4 horas
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
                  <p className="text-sm text-[var(--status-warning-text)]">Prioridad estimada</p>
                  <p className="mt-1 text-2xl font-black text-[var(--status-warning-text)]">
                    AMARILLO
                  </p>
                  <p className="mt-1 text-sm text-[var(--status-warning-text)]">
                    Requiere evaluación médica hoy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 pb-8 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.value}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-overlay-05)] p-5"
            >
              <p className="text-3xl font-black text-[var(--accent-text)]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{stat.label}</p>
            </div>
          ))}
        </div>

        <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--border)] pb-2 pt-6 text-xs text-[var(--text-tertiary)]">
          <span>Equipo clínico y administración</span>
          <Link
            href="/clinica/dashboard"
            className="underline-offset-4 transition hover:text-[var(--text-secondary)] hover:underline"
          >
            Acceso equipo clínico
          </Link>
          <Link
            href="/admin/clinicas"
            className="underline-offset-4 transition hover:text-[var(--text-secondary)] hover:underline"
          >
            Administrar clínicas
          </Link>
        </footer>
      </section>
    </main>
  );
}
