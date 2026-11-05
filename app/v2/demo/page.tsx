import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/v2/ui/Notice";

export const metadata: Metadata = { title: "Herramientas de demostración — Frontera 2.0" };

// Índice de herramientas de desarrollo. No forma parte del recorrido del paciente.
export default function DemoIndex() {
  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-10">
      <Notice variant="alert" title="Solo desarrollo">
        Estas herramientas sirven para revisar el prototipo. No las verá la persona usuaria.
      </Notice>
      <h1 className="f2-title mt-8">Herramientas de demostración</h1>
      <ul className="f2-body mt-4 space-y-3">
        <li>
          <Link className="f2-focus text-f2-brand underline underline-offset-4" href="/v2">
            Recorrido del paciente (desde P01)
          </Link>
        </li>
        <li>
          <Link className="f2-focus text-f2-brand underline underline-offset-4" href="/v2/demo/design-system">
            Design system (Hito 2)
          </Link>
        </li>
        <li className="text-f2-muted">Selector de escenarios (llega en el Hito 6)</li>
      </ul>
    </main>
  );
}
