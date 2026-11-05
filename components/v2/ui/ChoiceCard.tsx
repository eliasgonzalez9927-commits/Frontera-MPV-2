import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/v2/utils/cn";

type ChoiceCardProps = {
  /** radio = selección única, checkbox = selección múltiple */
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
};

// El estado seleccionado se comunica con borde grueso, fondo y un indicador con forma
// (punto o tilde), nunca solo con color.
export function ChoiceCard({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
  invalid,
}: ChoiceCardProps) {
  return (
    <label className={cn("relative block", disabled && "opacity-60")}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-invalid={type === "checkbox" && invalid ? true : undefined}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex min-h-[64px] items-start gap-3 rounded-2xl border-2 bg-f2-surface p-4 transition-colors",
          "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-f2-brand",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          checked
            ? "border-f2-brand bg-f2-brand-soft"
            : invalid
              ? "border-f2-danger"
              : "border-f2-border hover:border-f2-control"
        )}
      >
        {icon && (
          <span className="mt-0.5 text-f2-brand" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="flex-1">
          <span className="f2-option block text-f2-ink">{label}</span>
          {description && (
            <span className="f2-support mt-0.5 block text-f2-muted">{description}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center border-2",
            type === "radio" ? "rounded-full" : "rounded-md",
            checked ? "border-f2-brand bg-f2-brand text-white" : "border-f2-control bg-f2-surface"
          )}
        >
          {checked &&
            (type === "radio" ? (
              <span className="size-2 rounded-full bg-white" />
            ) : (
              <Check className="size-4" strokeWidth={3} />
            ))}
        </span>
      </span>
    </label>
  );
}
