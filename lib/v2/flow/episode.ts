// Código de episodio FICTICIO. Es solo decorativo: no identifica ningún registro ni da acceso a nada.

export function buildEpisodeCode(seed: number) {
  const digits = String(Math.abs(Math.trunc(seed)) % 10000).padStart(4, "0");
  return `DEMO-${digits}-FICT`;
}

/** Simula el envío: solo espera. No transmite nada. */
export function simulateSend(durationMs = 1400): { promise: Promise<void>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, durationMs);
  });
  return { promise, cancel: () => clearTimeout(timer) };
}
