import { ChevronDown } from "lucide-react";
import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/v2/utils/cn";
import { FieldError } from "./FieldError";

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
};

// Selector nativo: en móvil abre el selector del sistema (accesible y cómodo con una mano).
export function SelectField({ label, hint, error, placeholder, options, className, value, ...rest }: SelectFieldProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="f2-label block text-f2-ink">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="f2-support mt-1 text-f2-muted">
          {hint}
        </p>
      )}
      <div className="relative mt-2">
        <select
          id={id}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "f2-option f2-focus min-h-[52px] w-full appearance-none rounded-xl border-2 bg-f2-surface py-3 pl-4 pr-11 text-f2-ink",
            error ? "border-f2-danger" : "border-f2-control",
            value === "" && "text-f2-muted",
            className
          )}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-f2-ink">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-f2-muted"
          aria-hidden="true"
        />
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
