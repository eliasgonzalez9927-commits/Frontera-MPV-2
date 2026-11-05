"use client";

import { useId } from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

// Texto de demostración. El contenido definitivo sobre datos lo define cada institución.
export function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const id = useId();

  return (
    <Dialog open={open} onClose={onClose} labelledBy={`${id}-title`}>
      <h2 id={`${id}-title`} className="f2-title">
        Cómo se usa tu información
      </h2>

      <div className="f2-body mt-4 space-y-4">
        <div>
          <h3 className="f2-subtitle">En esta demostración</h3>
          <p className="mt-1 text-f2-muted">
            No se envía ni se guarda nada. Lo que escribís queda solo en esta pestaña y se pierde al
            cerrarla. Usá siempre datos de ejemplo.
          </p>
        </div>
        <div>
          <h3 className="f2-subtitle">En una implementación real</h3>
          <p className="mt-1 text-f2-muted">
            Quién puede ver tus datos, para qué se usan y por cuánto tiempo lo define cada institución
            y se te informa antes de que respondas. Ese texto todavía no está definido.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Button variant="secondary" onClick={onClose}>
          Entendido
        </Button>
      </div>
    </Dialog>
  );
}
