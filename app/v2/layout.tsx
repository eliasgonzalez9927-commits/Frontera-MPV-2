import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FlowProvider } from "@/components/v2/flow/FlowProvider";

export const metadata: Metadata = {
  title: "Frontera 2.0 — Prototipo del paciente",
  description: "Prototipo visual navegable. Datos ficticios, sin backend.",
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="f2-root">
      <FlowProvider>{children}</FlowProvider>
    </div>
  );
}
