import type { ReactNode } from "react";

// Área inferior de acciones. Respeta el área segura de iOS y queda visible con el teclado móvil.
export function ActionFooter({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-f2-border bg-f2-surface">
      <div className="mx-auto w-full max-w-[560px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {note && <p className="f2-support mb-2 text-center text-f2-muted">{note}</p>}
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </footer>
  );
}
