"use client";

import { Phone } from "lucide-react";
import { useId } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Notice } from "./Notice";

type HelpSheetProps = {
  open: boolean;
  onClose: () => void;
};

// Contenido de demostración: el texto final de emergencia requiere aprobación clínica y local.
export function HelpSheet({ open, onClose }: HelpSheetProps) {
  const id = useId();

  return (
    <Dialog open={open} onClose={onClose} labelledBy={`${id}-title`}>
      <h2 id={`${id}-title`} className="f2-title">
        Ayuda
      </h2>

      <div className="f2-body mt-4 space-y-4 text-f2-ink">
        <p>
          Respondé con tus palabras, sin términos médicos. Podés volver atrás y corregir cualquier
          respuesta antes de enviar.
        </p>

        <Notice variant="danger" title="Si es una emergencia">
          Acercate de inmediato al personal de la institución o contactá a los servicios de
          emergencias. No esperes a completar este formulario.
        </Notice>

        <p className="f2-support flex items-center gap-2 text-f2-muted">
          <Phone className="size-4" aria-hidden="true" />
          Contenido de demostración. El texto final requiere aprobación clínica y local.
        </p>
      </div>

      <div className="mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Dialog>
  );
}
