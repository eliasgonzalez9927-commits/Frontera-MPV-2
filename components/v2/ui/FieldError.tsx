import { CircleAlert } from "lucide-react";

// Se asocia al campo con aria-describedby; el icono evita depender solo del color.
// role="alert": cuando aparece tras un intento de avanzar, se anuncia a lectores de pantalla.
export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} role="alert" className="f2-error mt-2 flex items-start gap-1.5 text-f2-danger">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
