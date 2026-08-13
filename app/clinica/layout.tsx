import { Suspense } from "react";
import type { ReactNode } from "react";
import { ClinicShell } from "./ClinicShell";

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ClinicShell>{children}</ClinicShell>
    </Suspense>
  );
}
