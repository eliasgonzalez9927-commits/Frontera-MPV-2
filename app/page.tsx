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
    <main className="min-h-screen bg-[#071826] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-brand text-xl font-bold tracking-tight">
              FRON<span className="text-[#00C9A7]">TERA</span>
            </p>
            <p className="text-xs text-slate-300">Pre-triaje digital</p>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#00C9A7]/30 bg-[#00C9A7]/10 px-4 py-2 text-sm text-[#00C9A7]">
              Hablá con Frontera por WhatsApp
            </div>

            <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              Pre-triaje digital para urgencias.
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-300">
              Orientamos la prioridad del caso y generamos un resumen para el
              equipo médico antes de ocupar una guardia.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-[#00C9A7] px-6 py-4 text-center font-bold text-[#071826] transition hover:scale-[1.02]"
              >
                Iniciar pre-triaje por WhatsApp
              </a>

              <Link
                href="/pretriaje"
                className="px-2 py-3 text-sm font-semibold text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
              >
                Prefiero hacerlo por web
              </Link>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
              Frontera no reemplaza una evaluación médica. Si estás frente a una
              emergencia, contactá a emergencias o dirigite a una guardia.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="rounded-[1.5rem] bg-[#102638] p-5">
              <p className="text-sm font-semibold text-[#00C9A7]">
                Caso simulado
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm text-slate-400">Paciente</p>
                  <p className="mt-1 font-semibold">Paciente sin identificar</p>
                </div>

                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm text-slate-400">Motivo</p>
                  <p className="mt-1 font-semibold">
                    Dolor abdominal hace 4 horas
                  </p>
                </div>

                <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4">
                  <p className="text-sm text-yellow-100">Prioridad estimada</p>
                  <p className="mt-1 text-2xl font-black text-yellow-200">
                    AMARILLO
                  </p>
                  <p className="mt-1 text-sm text-yellow-100/80">
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
              className="rounded-3xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-3xl font-black text-[#00C9A7]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>

        <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pb-2 pt-6 text-xs text-slate-500">
          <span>Equipo clínico y administración</span>
          <Link
            href="/clinica/dashboard"
            className="underline-offset-4 transition hover:text-slate-300 hover:underline"
          >
            Acceso equipo clínico
          </Link>
          <Link
            href="/admin/clinicas"
            className="underline-offset-4 transition hover:text-slate-300 hover:underline"
          >
            Administrar clínicas
          </Link>
        </footer>
      </section>
    </main>
  );
}
