import { cn } from "@/lib/v2/utils/cn";

type DigitalPassProps = {
  institutionName: string;
  episodeCode: string;
  patientName?: string;
};

// QR decorativo y determinista. NO codifica nada y no se puede escanear con sentido.
function decorativeMatrix(size = 21) {
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);

  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (inFinder(x, y) ? false : next() % 3 === 0))
  );
}

const finders = [
  [0, 0],
  [14, 0],
  [0, 14],
];

function DecorativeQr() {
  const size = 21;
  const matrix = decorativeMatrix(size);

  return (
    <div
      role="img"
      aria-label="Código QR decorativo. No es válido y no contiene información."
      className="relative mx-auto size-44 overflow-hidden rounded-xl border border-f2-border bg-f2-surface p-2"
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full" aria-hidden="true">
        {matrix.map((row, y) =>
          row.map((on, x) =>
            on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--f2-ink)" /> : null
          )
        )}
        {finders.map(([fx, fy]) => (
          <g key={`${fx}-${fy}`}>
            <rect x={fx} y={fy} width="7" height="7" fill="var(--f2-ink)" />
            <rect x={fx + 1} y={fy + 1} width="5" height="5" fill="#fff" />
            <rect x={fx + 2} y={fy + 2} width="3" height="3" fill="var(--f2-ink)" />
          </g>
        ))}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center bg-white/70">
        <span className="f2-label -rotate-12 rounded-md border-2 border-f2-danger bg-f2-surface px-2 py-1 uppercase tracking-wide text-f2-danger">
          No válido
        </span>
      </span>
    </div>
  );
}

export function DigitalPass({ institutionName, episodeCode, patientName }: DigitalPassProps) {
  return (
    <article
      aria-label="Pase digital de demostración"
      className={cn("overflow-hidden rounded-3xl border border-f2-border bg-f2-surface")}
    >
      <div className="bg-f2-brand px-5 py-4 text-white">
        <p className="f2-label opacity-90">Pase digital · EJEMPLO</p>
        <p className="f2-subtitle mt-0.5">{institutionName}</p>
      </div>

      <div className="space-y-5 p-5">
        <DecorativeQr />

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="f2-label text-f2-muted">Episodio (ficticio)</dt>
            <dd className="f2-option font-mono text-f2-ink">{episodeCode}</dd>
          </div>
          {patientName && (
            <div>
              <dt className="f2-label text-f2-muted">Paciente (ficticio)</dt>
              <dd className="f2-option text-f2-ink">{patientName}</dd>
            </div>
          )}
        </dl>

        <p className="f2-support rounded-xl bg-f2-bg p-3 text-f2-muted">
          Este pase no representa un turno ni una prioridad clínica.
        </p>
      </div>
    </article>
  );
}
