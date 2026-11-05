import { useId } from "react";
import type { ReactNode } from "react";
import { FieldError } from "./FieldError";

type ChoiceGroupProps = {
  /** La pregunta. Es la leyenda del fieldset, así los lectores de pantalla la anuncian. */
  legend: ReactNode;
  description?: string;
  error?: string;
  required?: boolean;
  /** Muestra la marca "Opcional" bajo la pregunta. */
  optional?: boolean;
  /** Nivel del encabezado de la pregunta. En pantallas de una sola pregunta es 1. */
  headingLevel?: 1 | 2 | 3;
  children: ReactNode;
};

export function ChoiceGroup({
  legend,
  description,
  error,
  required,
  optional,
  headingLevel = 1,
  children,
}: ChoiceGroupProps) {
  const id = useId();
  const descId = `${id}-desc`;
  const errorId = `${id}-error`;
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";

  return (
    <fieldset
      aria-required={required || undefined}
      aria-describedby={[description && descId, error && errorId].filter(Boolean).join(" ") || undefined}
      className="min-w-0 border-0 p-0"
    >
      <legend className="p-0">
        <Heading className="f2-question text-f2-ink">{legend}</Heading>
      </legend>
      {optional && <p className="f2-label mt-1 text-f2-muted">Opcional</p>}
      {description && (
        <p id={descId} className="f2-body mt-2 text-f2-muted">
          {description}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3">{children}</div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
