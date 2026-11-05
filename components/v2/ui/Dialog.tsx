"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
};

// Usa <dialog> nativo: trampa de foco, Escape y retorno de foco los resuelve el navegador.
// En móvil se muestra como hoja inferior; desde md, centrado.
export function Dialog({ open, onClose, labelledBy, describedBy, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-f2-surface p-0 text-f2-ink backdrop:bg-black/40 md:m-auto md:max-w-[480px] md:rounded-3xl"
    >
      {open ? <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div> : null}
    </dialog>
  );
}
