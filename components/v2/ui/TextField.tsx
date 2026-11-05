import { useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/v2/utils/cn";
import { FieldError } from "./FieldError";

type SharedProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Muestra "Opcional" junto a la etiqueta cuando el campo no es obligatorio. */
  optional?: boolean;
  /** "question": la etiqueta es la pregunta principal de la pantalla (h1 con estilo de pregunta). */
  variant?: "field" | "question";
};

const controlClass = (invalid: boolean) =>
  cn(
    "f2-option w-full rounded-xl border-2 bg-f2-surface px-4 text-f2-ink placeholder:text-f2-muted/80 f2-focus",
    "disabled:cursor-not-allowed disabled:bg-f2-bg disabled:text-f2-muted",
    invalid ? "border-f2-danger" : "border-f2-control"
  );

function FieldFrame({
  id,
  label,
  hint,
  error,
  optional,
  variant = "field",
  children,
}: SharedProps & { id: string; children: React.ReactNode }) {
  const isQuestion = variant === "question";

  return (
    <div>
      {isQuestion ? (
        <h1 className="f2-question text-f2-ink">
          <label htmlFor={id}>{label}</label>
        </h1>
      ) : (
        <label htmlFor={id} className="f2-label flex items-baseline justify-between gap-3 text-f2-ink">
          <span>{label}</span>
          {optional && <span className="font-normal text-f2-muted">Opcional</span>}
        </label>
      )}
      {isQuestion && optional && <p className="f2-label mt-1 text-f2-muted">Opcional</p>}
      {hint && (
        <p id={`${id}-hint`} className={isQuestion ? "f2-body mt-2 text-f2-muted" : "f2-support mt-1 text-f2-muted"}>
          {hint}
        </p>
      )}
      <div className={isQuestion ? "mt-4" : "mt-2"}>{children}</div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

type TextFieldProps = SharedProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({ label, hint, error, optional, variant, className, ...rest }: TextFieldProps) {
  const id = useId();

  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} optional={optional} variant={variant}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClass(Boolean(error)), "min-h-[52px] py-3", className)}
        {...rest}
      />
    </FieldFrame>
  );
}

type TextAreaProps = SharedProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { showCount?: boolean };

export function TextArea({
  label,
  hint,
  error,
  optional,
  variant,
  showCount,
  className,
  value,
  maxLength,
  ...rest
}: TextAreaProps) {
  const id = useId();
  const length = typeof value === "string" ? value.length : 0;

  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} optional={optional} variant={variant}>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClass(Boolean(error)), "min-h-40 resize-y py-3", className)}
        {...rest}
      />
      {showCount && maxLength && (
        <p className="f2-support mt-1 text-right text-f2-muted" aria-live="off">
          {length} / {maxLength}
        </p>
      )}
    </FieldFrame>
  );
}
