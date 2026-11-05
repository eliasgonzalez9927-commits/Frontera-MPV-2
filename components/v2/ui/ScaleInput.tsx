import { cn } from "@/lib/v2/utils/cn";

type ScaleInputProps = {
  name: string;
  min?: number;
  max?: number;
  value: number | null;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  invalid?: boolean;
};

// Escala numérica con radios nativos: foco y flechas funcionan sin JS adicional.
export function ScaleInput({
  name,
  min = 0,
  max = 10,
  value,
  onChange,
  minLabel,
  maxLabel,
  invalid,
}: ScaleInputProps) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-11 sm:gap-2">
        {values.map((n) => {
          const selected = value === n;
          return (
            <label key={n} className="relative block">
              <input
                type="radio"
                name={name}
                value={n}
                checked={selected}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "f2-option flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border-2 transition-colors",
                  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-f2-brand",
                  selected
                    ? "border-f2-brand bg-f2-brand font-semibold text-white"
                    : invalid
                      ? "border-f2-danger bg-f2-surface text-f2-ink"
                      : "border-f2-control bg-f2-surface text-f2-ink hover:bg-f2-brand-soft"
                )}
              >
                {n}
              </span>
            </label>
          );
        })}
      </div>
      <div className="f2-support mt-2 flex justify-between gap-4 text-f2-muted">
        <span>{minLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
    </div>
  );
}
