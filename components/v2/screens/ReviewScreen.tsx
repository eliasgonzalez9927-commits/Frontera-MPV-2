"use client";

import { Pencil, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildEpisodeCode, simulateSend } from "@/lib/v2/flow/episode";
import { buildReview, getBirthDateNotice, type ReviewRow, type ReviewSection } from "@/lib/v2/flow/review";
import { routes } from "@/lib/v2/flow/routes";
import { useFlowScreen } from "../flow/useFlowScreen";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";
import { StageProgress } from "../ui/StageProgress";

function EditButton({ label, children, onClick }: { label: string; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="f2-label f2-focus -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-f2-brand hover:bg-f2-brand-soft"
    >
      <Pencil className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function Row({ row, onEdit }: { row: ReviewRow; onEdit: (route: string) => void }) {
  return (
    <div className="py-3">
      <dt className="f2-label text-f2-muted">{row.label}</dt>
      <dd className="f2-body mt-0.5 whitespace-pre-wrap break-words text-f2-ink">
        {row.value ?? <span className="italic text-f2-muted">{row.emptyLabel}</span>}
      </dd>
      {row.editRoute && (
        <EditButton label={row.editLabel ?? `Cambiar ${row.label}`} onClick={() => onEdit(row.editRoute!)}>
          {row.value === null ? "Responder" : "Cambiar"}
        </EditButton>
      )}
    </div>
  );
}

function Section({ section, onEdit }: { section: ReviewSection; onEdit: (route: string) => void }) {
  const titleId = `review-${section.id}`;

  return (
    <section aria-labelledby={titleId} className="border-t border-f2-border py-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="f2-subtitle text-f2-ink">
          {section.title}
        </h2>
        {section.editRoute && (
          <EditButton label={`Editar: ${section.title}`} onClick={() => onEdit(section.editRoute!)}>
            Editar
          </EditButton>
        )}
      </div>
      {section.note && (
        <p className="f2-label mt-1 inline-block rounded-full bg-f2-warn-soft px-2.5 py-0.5 text-f2-warn">
          {section.note}
        </p>
      )}
      {section.rows.length === 0 ? (
        <p className="f2-body mt-2 text-f2-muted">Sin preguntas en este recorrido.</p>
      ) : (
        <dl className="mt-1 divide-y divide-f2-border">
          {section.rows.map((row) => (
            <Row key={row.id} row={row} onEdit={onEdit} />
          ))}
        </dl>
      )}
    </section>
  );
}

// P07 — Revisión. Todo se puede editar; al terminar de editar se vuelve acá.
export function ReviewScreen() {
  const router = useRouter();
  const { state, dispatch, now, allowed, goBack } = useFlowScreen(routes.review);
  const [sending, setSending] = useState(false);
  const pending = useRef<{ cancel: () => void } | null>(null);

  // Si se llegó acá con el modo edición todavía activo (p. ej. con el botón Atrás del navegador),
  // se limpia: la revisión es el punto de llegada de cualquier edición. Corre solo al montar
  // (dispatch es estable) y es idempotente: si no había edición, no cambia nada. Importante: no
  // depende de editFromReview, porque "Cambiar" lo activa con esta pantalla todavía montada.
  useEffect(() => {
    const timer = window.setTimeout(() => dispatch({ type: "finishEdit" }), 0);
    return () => window.clearTimeout(timer);
  }, [dispatch]);

  // Si se sale de la pantalla durante el envío simulado, se cancela.
  useEffect(() => () => pending.current?.cancel(), []);

  if (!allowed) return null;

  const sections = buildReview(state);
  const birthNotice = getBirthDateNotice(state, now);

  function edit(route: string) {
    dispatch({ type: "startEdit" });
    router.push(route);
  }

  async function handleSend() {
    if (sending) return;
    setSending(true);

    const simulation = simulateSend();
    pending.current = simulation;
    await simulation.promise;

    // Solo se llega acá si la espera terminó (si se canceló, la promesa nunca se resuelve).
    dispatch({ type: "submit", episodeCode: buildEpisodeCode(Math.floor(Math.random() * 10000)) });
    router.push(routes.pass);
  }

  return (
    <PatientShell
      onBack={goBack}
      progress={<StageProgress current="revision" />}
      footer={
        <ActionFooter note="En esta demostración no se envía nada.">
          <Button
            loading={sending}
            iconLeft={sending ? undefined : <Send className="size-5" aria-hidden="true" />}
            onClick={handleSend}
          >
            {sending ? "Enviando…" : "Enviar (simulación)"}
          </Button>
        </ActionFooter>
      }
    >
      <h1 className="f2-question">Revisá tu consulta</h1>
      <p className="f2-body mt-2 text-f2-muted">
        Podés cambiar cualquier dato antes de enviar. Lo que escribiste en el motivo se muestra tal cual.
      </p>
      <p className="f2-support mt-3 text-f2-muted">
        Institución: <span className="text-f2-ink">{state.institution.name}</span> (ficticia)
      </p>

      <div className="mt-4">
        {sections.map((section) => (
          <Section key={section.id} section={section} onEdit={edit} />
        ))}
      </div>

      {birthNotice && (
        <Notice variant="alert" className="mb-4">
          {birthNotice}
        </Notice>
      )}

      <Notice variant="info" title="Aviso de privacidad">
        Esta es una demostración: lo que cargaste no sale de tu navegador y se pierde al cerrar la
        pestaña. En una implementación real, la institución te informa quién ve estos datos y por
        cuánto tiempo.
      </Notice>

      {sending && (
        <p role="status" className="f2-support mt-4 text-f2-muted">
          Enviando tu consulta de demostración…
        </p>
      )}
    </PatientShell>
  );
}
