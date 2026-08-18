import Link from "next/link";
import { buildGeneralWhatsappUrl } from "@/lib/whatsappLink";

const problems = [
  {
    title: "Las guardias están colapsadas",
    body: "La mayoría de las consultas son de bajo riesgo, pero ocupan el mismo lugar en la fila que una emergencia real.",
  },
  {
    title: "Vos no sabés qué tan grave es ni cuánto vas a esperar",
    body: "Entrás a una sala de espera a ciegas, sin saber si tu caso es urgente o si te va a tocar esperar horas.",
  },
  {
    title: "El equipo médico tampoco sabe qué le llega",
    body: "Cada paciente nuevo arranca de cero contando su síntoma en la ventanilla, sin ningún orden de prioridad.",
  },
];

const steps = [
  {
    step: "1",
    title: "Escaneás el QR de la guardia",
    body: "Al llegar (o antes, desde tu casa), escaneás el código y se abre WhatsApp con Frontera.",
  },
  {
    step: "2",
    title: "La IA te guía y te dice qué podés tener",
    body: "Le contás tus síntomas en lenguaje natural y Frontera te orienta sobre la prioridad estimada y el tiempo aproximado de espera.",
  },
  {
    step: "3",
    title: "El médico ya sabe con qué llegás",
    body: "Tu caso queda armado y clasificado por urgencia antes de que te llamen — sin repetir todo de cero en la ventanilla.",
  },
];

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
    value: "~28M",
    label: "personas con cobertura médica en Argentina",
  },
];

export default function Home() {
  const whatsappUrl = buildGeneralWhatsappUrl();

  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--text)]">
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-brand text-xl font-bold tracking-tight">
              FRON<span className="text-[var(--accent-text)]">TERA</span>
            </p>
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
              Salud conectada. Decisiones que importan.
            </p>
          </div>
        </header>

        {/* Hero */}
        <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#00C9A7]/30 bg-[#00C9A7]/10 px-4 py-2 text-sm text-[var(--accent-text)]">
              Pre-triaje digital para urgencias
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Escaneás un QR y una IA te guía antes de que te atiendan.
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-8 text-[var(--text-secondary)]">
              Frontera te dice qué podés tener y cuánto vas a esperar. Del
              otro lado, el equipo médico ya sabe con qué problema venís y
              qué tan urgente es, antes de llamarte.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-[#00C9A7] px-6 py-4 text-center font-bold text-[var(--accent-contrast)] transition hover:scale-[1.02]"
              >
                Probá el pre-triaje por WhatsApp
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

        {/* El problema */}
        <div className="border-t border-[var(--border)] py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--accent-text)]">
            El problema
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight md:text-4xl">
            Nadie sale ganando cuando una guardia funciona a ciegas.
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {problems.map((problem) => (
              <div
                key={problem.title}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-overlay-05)] p-6"
              >
                <h3 className="text-lg font-bold">{problem.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {problem.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
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
        </div>

        {/* Lo que ya funciona */}
        <div className="border-t border-[var(--border)] py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--accent-text)]">
            Lo que ya funciona
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight md:text-4xl">
            El primer paso: pre-triaje digital para urgencias.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Antes de que llegues a una guardia, Frontera ordena tu caso —
            orienta qué tan urgente es y prepara un resumen para el equipo
            médico.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-overlay-05)] p-6"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00C9A7]/15 text-sm font-black text-[var(--accent-text)]">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Del lado del equipo médico */}
        <div className="border-t border-[var(--border)] py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--accent-text)]">
                Del lado del equipo médico
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Un tablero en vivo con quién espera hace cuánto, y qué tan
                urgente es cada uno.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                Cada caso llega ya clasificado por prioridad — rojo, amarillo
                o verde — con el tiempo de espera actualizándose solo. El
                equipo ve de un vistazo a quién atender primero, sin tener
                que preguntar caso por caso.
              </p>

              <div className="mt-6">
                <Link
                  href="/clinica/dashboard"
                  className="text-sm font-semibold text-[var(--accent-text)] underline-offset-4 hover:underline"
                >
                  Ver el panel de una clínica →
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface-overlay-05)] p-3">
              <div className="space-y-2 rounded-[1.5rem] bg-[var(--surface-raised)] p-3">
                <div className="flex items-center gap-3 rounded-xl border-l-4 border-l-[var(--status-danger-border)] bg-[var(--surface-overlay-05)] px-4 py-3">
                  <span className="rounded px-2 py-0.5 text-xs font-bold text-[var(--status-danger-text)]">
                    ROJO
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold">
                    Dolor de pecho y falta de aire
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">2 min</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border-l-4 border-l-[var(--status-warning-border)] bg-[var(--surface-overlay-05)] px-4 py-3">
                  <span className="rounded px-2 py-0.5 text-xs font-bold text-[var(--status-warning-text)]">
                    AMARILLO
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold">
                    Fiebre y vómitos desde anoche
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">12 min</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border-l-4 border-l-[#00C9A7] bg-[var(--surface-overlay-05)] px-4 py-3">
                  <span className="rounded px-2 py-0.5 text-xs font-bold text-[var(--accent-text)]">
                    VERDE
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold">
                    Dolor de garganta hace 2 días
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">44 min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-2xl bg-[#00C9A7] px-6 py-4 text-center font-bold text-[var(--accent-contrast)] transition hover:scale-[1.02]"
            >
              Probar Frontera ahora
            </a>
          </div>
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
