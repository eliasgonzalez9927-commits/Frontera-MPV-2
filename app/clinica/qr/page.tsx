"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Suspense, useEffect, useState } from "react";
import { buildClinicWhatsappUrl } from "@/lib/whatsappLink";

type Clinic = {
  name: string;
  slug: string;
  is_active: boolean;
};

function ClinicQrContent() {
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic")?.trim() ?? "";
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [error, setError] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const visibleError = clinicSlug ? error : "Falta indicar la clínica.";

  useEffect(() => {
    if (!clinicSlug) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      const nextTargetUrl = `${window.location.origin}/pretriaje?source=qr&clinic=${encodeURIComponent(
        clinicSlug
      )}`;
      setTargetUrl(nextTargetUrl);

      setWhatsappUrl(buildClinicWhatsappUrl(clinicSlug));

      fetch(`/api/clinics/${clinicSlug}`)
        .then(async (response) => {
          const payload = await response.json();

          if (!active) {
            return;
          }

          if (!response.ok) {
            setError(
              response.status === 404
                ? "No encontramos esta clínica."
                : payload.error ?? "No pudimos cargar la clínica."
            );
            return;
          }

          setClinic(payload.clinic);
          setError("");
        })
        .catch(() => {
          if (active) {
            setError("No pudimos cargar la clínica.");
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clinicSlug]);

  async function copyLink() {
    if (!whatsappUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(whatsappUrl);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("No se pudo copiar el link.");
    }
  }

  return (
    <main className="min-h-screen bg-[#071826] px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <Link
          href={`/clinica/dashboard${
            clinicSlug ? `?clinic=${encodeURIComponent(clinicSlug)}` : ""
          }`}
          className="text-sm text-[#00C9A7]"
        >
          ← Volver al dashboard
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
          {visibleError ? (
            <div>
              <h1 className="text-3xl font-black">No pudimos generar el QR</h1>
              <p className="mt-3 text-slate-300">{visibleError}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#00C9A7]">
                {clinic?.name || "Cargando clínica..."}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                QR de pre-triaje de guardia
              </h1>
              <p className="mt-4 text-slate-300">
                Escaneá este QR al llegar a urgencias para iniciar tu
                pre-triaje por WhatsApp, hablando con Frontera.
              </p>

              <div className="mt-8 flex flex-col items-center gap-5 rounded-[1.5rem] bg-white p-6 text-[#071826]">
                {whatsappUrl && (
                  <QRCodeSVG
                    value={whatsappUrl}
                    size={280}
                    level="M"
                    marginSize={4}
                    title={`QR de pre-triaje por WhatsApp ${clinic?.name ?? clinicSlug}`}
                  />
                )}
                <p className="break-all text-center text-sm font-semibold">
                  {whatsappUrl}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Copiar link de WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-2xl bg-[#00C9A7] px-5 py-3 text-sm font-bold text-[#071826]"
                >
                  Imprimir QR
                </button>
              </div>

              {copyMessage && (
                <p className="mt-3 text-sm text-slate-300">{copyMessage}</p>
              )}

              <details className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                <summary className="cursor-pointer font-semibold text-white">
                  Alternativa: pre-triaje por web (sin WhatsApp)
                </summary>
                <p className="mt-3 break-all">{targetUrl}</p>
              </details>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function ClinicQrPage() {
  return (
    <Suspense fallback={null}>
      <ClinicQrContent />
    </Suspense>
  );
}
