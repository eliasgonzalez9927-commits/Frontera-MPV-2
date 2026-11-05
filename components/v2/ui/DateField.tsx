import { useId } from "react";
import { cn } from "@/lib/v2/utils/cn";
import { FieldError } from "./FieldError";

type DatePart = "day" | "month" | "year";

type DateFieldProps = {
  legend: string;
  hint?: string;
  day: string;
  month: string;
  year: string;
  error?: string;
  onChange: (part: DatePart, value: string) => void;
  onBlur?: () => void;
};

const parts: Array<{ part: DatePart; label: string; maxLength: number; width: string; placeholder: string }> = [
  { part: "day", label: "Día", maxLength: 2, width: "w-20", placeholder: "15" },
  { part: "month", label: "Mes", maxLength: 2, width: "w-20", placeholder: "06" },
  { part: "year", label: "Año", maxLength: 4, width: "w-28", placeholder: "1990" },
];

// Fecha en tres campos numéricos: más fácil de completar en móvil que un selector de calendario
// y sin depender del formato regional. Solo admite dígitos.
// Nota de implementación: autoComplete queda en "off" a propósito para que el navegador no
// complete datos reales de quien prueba el prototipo. En una versión real corresponde usar
// bday-day / bday-month / bday-year (WCAG 1.3.5).
export function DateField({ legend, hint, day, month, year, error, onChange, onBlur }: DateFieldProps) {
  const id = useId();
  const values: Record<DatePart, string> = { day, month, year };
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      className="min-w-0 border-0 p-0"
      aria-describedby={describedBy}
      // El blur se reporta solo al salir de TODO el grupo: pasar de día a mes no es "terminar".
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.();
      }}
    >
      <legend className="f2-label p-0 text-f2-ink">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="f2-support mt-1 text-f2-muted">
          {hint}
        </p>
      )}
      <div className="mt-2 flex gap-3">
        {parts.map(({ part, label, maxLength, width, placeholder }) => (
          <div key={part} className={width}>
            <label htmlFor={`${id}-${part}`} className="f2-support block text-f2-muted">
              {label}
            </label>
            <input
              id={`${id}-${part}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={maxLength}
              placeholder={placeholder}
              value={values[part]}
              aria-invalid={error ? true : undefined}
              onChange={(event) => onChange(part, event.target.value.replace(/\D/g, ""))}
              className={cn(
                "f2-option f2-focus mt-1 min-h-[52px] w-full rounded-xl border-2 bg-f2-surface px-3 py-3 text-center text-f2-ink placeholder:text-f2-muted/70",
                error ? "border-f2-danger" : "border-f2-control"
              )}
            />
          </div>
        ))}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </fieldset>
  );
}
