"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TriageResult } from "@/lib/triage";
import ResultView from "../ResultView";

type PageProps = {
  params: Promise<{ caseCode: string }>;
};

export default function TriageResultPage({ params }: PageProps) {
  const [caseCode, setCaseCode] = useState("");
  const [caseData, setCaseData] = useState<TriageResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCase() {
      const resolved = await params;
      if (!active) {
        return;
      }

      setCaseCode(resolved.caseCode);
      const response = await fetch(`/api/triage-cases/${resolved.caseCode}`);
      const payload = await response.json();

      if (!active) {
        return;
      }

      if (!response.ok) {
        setError(
          response.status === 404
            ? "No encontramos este caso."
            : payload.error ?? "No se pudo cargar el caso."
        );
        return;
      }

      setCaseData(payload.case);
    }

    loadCase().catch(() => {
      if (active) {
        setError("No se pudo cargar el caso.");
      }
    });

    return () => {
      active = false;
    };
  }, [params]);

  if (caseData) {
    return <ResultView caseData={caseData} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#071923] px-6 text-white">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-3xl font-black">
          {error ? "No pudimos cargar el caso" : "Cargando caso"}
        </h1>
        <p className="mt-3 text-slate-300">
          {error || `Buscando el caso ${caseCode || "solicitado"}...`}
        </p>
        <Link
          href="/pretriaje"
          className="mt-6 inline-flex rounded-2xl bg-[#52d6c4] px-5 py-3 font-bold text-[#071923]"
        >
          Iniciar nuevo pre-triaje
        </Link>
      </div>
    </main>
  );
}
