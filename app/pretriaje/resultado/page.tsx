"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TriageResult } from "@/lib/triage";
import ResultView from "./ResultView";

export default function TriageResultFallbackPage() {
  const [caseData, setCaseData] = useState<TriageResult | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = sessionStorage.getItem("frontera-last-case");
      const error = sessionStorage.getItem("frontera-last-error");
      if (raw) {
        setCaseData(JSON.parse(raw));
      }
      if (error) {
        setFallbackMessage(error);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (caseData) {
    return <ResultView caseData={caseData} notice={fallbackMessage} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#071923] px-6 text-white">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-3xl font-black">No hay un caso cargado</h1>
        <p className="mt-3 text-slate-300">
          Iniciá un pre-triaje para generar una prioridad y resumen médico.
        </p>
        <Link
          href="/pretriaje"
          className="mt-6 inline-flex rounded-2xl bg-[#52d6c4] px-5 py-3 font-bold text-[#071923]"
        >
          Iniciar pre-triaje
        </Link>
      </div>
    </main>
  );
}
