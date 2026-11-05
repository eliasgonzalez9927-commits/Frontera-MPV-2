import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/v2/utils/cn";
import { FronteraMark } from "../ui/Logo";

// Mensaje de Frontera (izquierda).
export function BotBubble({
  id,
  text,
  detail,
  children,
  className,
}: {
  id?: string;
  text?: string;
  detail?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("f2-enter flex items-start gap-2", className)}>
      <FronteraMark size={28} className="mt-1 shrink-0" />
      <div
        id={id}
        className="f2-body min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border border-f2-border bg-f2-surface px-4 py-3 text-f2-ink"
      >
        <span className="sr-only">Frontera: </span>
        {text && <p className="whitespace-pre-wrap break-words font-semibold">{text}</p>}
        {detail && <p className={cn("f2-support break-words text-f2-muted", text && "mt-1")}>{detail}</p>}
        {children}
      </div>
    </div>
  );
}

// Respuesta de la persona (derecha), con la opción de cambiarla.
export function UserBubble({
  text,
  changeLabel,
  onChange,
}: {
  text: string;
  /** Texto accesible del botón, p. ej. "Cambiar respuesta: ¿Qué te está pasando?". */
  changeLabel: string;
  onChange: () => void;
}) {
  return (
    <div className="f2-enter flex flex-col items-end">
      <div className="f2-body min-w-0 max-w-[88%] rounded-2xl rounded-tr-md bg-f2-brand px-4 py-3 text-white">
        <span className="sr-only">Tu respuesta: </span>
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
      <button
        type="button"
        aria-label={changeLabel}
        onClick={onChange}
        className="f2-label f2-focus -mr-2 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-f2-brand hover:bg-f2-brand-soft"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Cambiar
      </button>
    </div>
  );
}
