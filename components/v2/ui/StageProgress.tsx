import { stages, getStageNumber, type StageId } from "@/lib/v2/stages";
import { cn } from "@/lib/v2/utils/cn";

// El progreso se lee en texto ("Etapa 3 de 6 · Motivo"), no solo en las barras.
export function StageProgress({ current }: { current: StageId }) {
  const number = getStageNumber(current);
  const total = stages.length;
  const label = stages[number - 1].label;

  return (
    <div>
      <p className="f2-label flex justify-between gap-3 text-f2-muted">
        <span>
          Etapa {number} de {total}
        </span>
        <span className="text-f2-ink">{label}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Progreso del recorrido"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={number}
        aria-valuetext={`Etapa ${number} de ${total}: ${label}`}
        className="mt-2 flex items-center gap-1.5"
      >
        {stages.map((stage, index) => (
          <span
            key={stage.id}
            className={cn(
              "flex-1 rounded-full",
              index < number - 1 && "h-1.5 bg-f2-brand",
              index === number - 1 && "h-2.5 bg-f2-brand",
              index > number - 1 && "h-1.5 bg-f2-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
