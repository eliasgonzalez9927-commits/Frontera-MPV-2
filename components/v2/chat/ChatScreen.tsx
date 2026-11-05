"use client";

import { RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buildDemoIdentification } from "@/lib/v2/fixtures/demoIdentity";
import { getAnswerText, getBotMessage } from "@/lib/v2/chat/script";
import { CONTACT_SEEN_KEY, getActiveIndex, getChatTurns, getVisibleTurns, type ChatTurn } from "@/lib/v2/chat/turns";
import { buildEpisodeCode, simulateSend } from "@/lib/v2/flow/episode";
import { getBirthDateNotice } from "@/lib/v2/flow/review";
import { questionnaireForState } from "@/lib/v2/questionnaires";
import { pruneOrphanAnswers } from "@/lib/v2/questionnaires/engine";
import { useFlow } from "../flow/FlowProvider";
import { PrivacySheet } from "../patient/PrivacySheet";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DigitalPass } from "../ui/DigitalPass";
import { Notice } from "../ui/Notice";
import { PatientShell } from "../ui/PatientShell";
import { BotBubble, UserBubble } from "./Bubbles";
import { TurnInput, type Commit } from "./TurnInput";

// Versión conversacional del recorrido del paciente. Comparte el estado con el recorrido por
// pantallas: lo único que cambia es cómo se presenta.
export function ChatScreen() {
  const { state, dispatch, now, simulation, setSimulation } = useFlow();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const pending = useRef<{ cancel: () => void } | null>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  const turns = getChatTurns(state, now);
  const activeIndex = getActiveIndex(turns);
  const visible = getVisibleTurns(turns, editingKey);
  const complete = activeIndex === -1 && editingKey === null;
  const submitted = complete && state.submission.status === "submitted";
  const stage = editingKey ?? (activeIndex >= 0 ? turns[activeIndex].key : submitted ? "pass" : "review");

  // Lleva el foco (y la vista) al último mensaje cuando aparece algo nuevo. La primera carga no lo roba.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const el = tailRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [stage]);

  // Si se sale durante el envío simulado, se cancela.
  useEffect(() => () => pending.current?.cancel(), []);

  /** E03 simulado: si hay una falla de conexión programada, el avance no ocurre y se avisa. */
  function canAdvance() {
    if (simulation.advanceFailures > 0) {
      setSimulation((s) => ({ ...s, advanceFailures: s.advanceFailures - 1, advanceError: true }));
      return false;
    }
    if (simulation.advanceError) setSimulation((s) => ({ ...s, advanceError: false }));
    return true;
  }

  function handleCommit(commit: Commit) {
    if (!canAdvance()) return;
    setNote(null);

    switch (commit.kind) {
      case "context":
        dispatch({ type: "setContext", value: commit.value });
        break;
      case "relationship":
        dispatch({ type: "setRelationship", value: commit.value });
        break;
      case "ack":
        dispatch({ type: "setAcknowledged", value: true });
        break;
      case "complaint":
        dispatch({ type: "setComplaint", value: commit.text });
        break;
      case "demoComplaint":
        dispatch({ type: "loadDemoComplaint", scenario: commit.scenario, text: commit.text });
        break;
      case "question": {
        const answers = { ...state.answers };
        if (commit.value === null) delete answers[commit.stepId];
        else answers[commit.stepId] = commit.value;
        // Si la respuesta cambió el recorrido, las respuestas de preguntas que ya no aplican se descartan.
        const { answers: pruned, removed } = pruneOrphanAnswers(questionnaireForState(state), answers);
        dispatch({ type: "replaceAnswers", answers: pruned, removed });
        dispatch({ type: "markSeen", id: commit.stepId });
        if (removed.length > 0) {
          setNote(
            `Tu cambio modificó las preguntas que siguen: descarté ${removed.length} respuesta${removed.length === 1 ? "" : "s"} que ya no aplica${removed.length === 1 ? "" : "n"}.`
          );
        }
        break;
      }
      case "id_name":
        dispatch({ type: "setIdentification", patch: { firstName: commit.firstName, lastName: commit.lastName } });
        break;
      case "id_document":
        dispatch({
          type: "setIdentification",
          patch: { documentType: commit.documentType, documentNumber: commit.documentNumber },
        });
        break;
      case "id_birth":
        dispatch({
          type: "setIdentification",
          patch: { birthDay: commit.day, birthMonth: commit.month, birthYear: commit.year },
        });
        break;
      case "id_contact":
        dispatch({ type: "setIdentification", patch: { contact: commit.contact } });
        dispatch({ type: "markSeen", id: CONTACT_SEEN_KEY });
        break;
      case "demoIdentity":
        dispatch({ type: "setIdentification", patch: buildDemoIdentification(state.relationship, now) });
        dispatch({ type: "markSeen", id: CONTACT_SEEN_KEY });
        break;
    }
    setEditingKey(null);
  }

  async function handleSend() {
    if (sending) return;
    setSending(true);

    const simulatedSend = simulateSend();
    pending.current = simulatedSend;
    await simulatedSend.promise;

    // E03 simulado: la conexión falla. No se pierde nada y el reintento funciona.
    if (simulation.sendFailures > 0) {
      setSimulation((s) => ({ ...s, sendFailures: s.sendFailures - 1 }));
      setSendError(true);
      setSending(false);
      return;
    }
    setSendError(false);
    setSending(false);
    dispatch({ type: "submit", episodeCode: buildEpisodeCode(Math.floor(Math.random() * 10000)) });
  }

  function restart() {
    dispatch({ type: "reset" });
    setSimulation((s) => ({ ...s, returnTo: null }));
    setEditingKey(null);
    setNote(null);
    setSendError(false);
    setConfirmRestart(false);
  }

  const patientName = [state.identification.firstName.trim(), state.identification.lastName.trim()]
    .filter(Boolean)
    .join(" ");
  const birthNotice = getBirthDateNotice(state, now);

  function renderTurn(turn: ChatTurn, index: number) {
    const message = getBotMessage(turn, state);
    const bubbleId = `bubble-${index}`;
    const isActive = turn.key === stage && (!turn.done || editingKey === turn.key);

    return (
      <li key={turn.key} className="space-y-3">
        <BotBubble id={bubbleId} text={message.text} detail={message.detail} />

        {isActive ? (
          <div ref={tailRef} tabIndex={-1} aria-labelledby={bubbleId} className="f2-enter pl-9 outline-none">
            <TurnInput
              turn={turn}
              state={state}
              now={now}
              labelledBy={bubbleId}
              onCommit={handleCommit}
              onOpenPrivacy={() => setPrivacyOpen(true)}
            />
            {editingKey === turn.key && (
              <div className="mt-3">
                <Button variant="ghost" onClick={() => setEditingKey(null)}>
                  Dejar como estaba
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <UserBubble
              text={getAnswerText(turn, state)}
              changeLabel={`Cambiar respuesta: ${message.text}`}
              onChange={() => setEditingKey(turn.key)}
            />
            {turn.kind === "id_birth" && birthNotice && (
              <BotBubble text="Una aclaración:" detail={birthNotice} />
            )}
          </>
        )}
      </li>
    );
  }

  return (
    <PatientShell>
      <div className="space-y-3">
        <BotBubble text="¡Hola! Soy Frontera." />
        <BotBubble
          text={`Estás en la guardia de ${state.institution.name}.`}
          detail="Te hago unas preguntas, de a una, para que el equipo te reciba con tu información ya ordenada. No reemplazo una evaluación médica."
        />
        <BotBubble
          text="Si es una emergencia, avisá al personal ahora."
          detail="No esperes a terminar la conversación."
        />
      </div>

      <ol aria-label="Conversación" className="mt-6 space-y-6">
        {visible.map(renderTurn)}
      </ol>

      {note && (
        <div className="mt-6" role="status">
          <Notice variant="alert">{note}</Notice>
        </div>
      )}

      {complete && !submitted && (
        <div ref={tailRef} tabIndex={-1} aria-labelledby="bubble-review" className="mt-6 space-y-3 outline-none">
          {sendError && (
            <div role="alert">
              <Notice variant="danger" title="No pudimos enviar tu consulta">
                Parece que se cortó la conexión. Tus respuestas siguen acá, no se perdieron. Probá de nuevo.
              </Notice>
            </div>
          )}
          <BotBubble
            id="bubble-review"
            text="Listo, ya tengo todo."
            detail="Podés cambiar cualquier respuesta con el botón “Cambiar”. En esta demostración no se envía nada."
          />
          <div className="pl-9">
            <Button
              loading={sending}
              iconLeft={sending ? undefined : <Send className="size-5" aria-hidden="true" />}
              onClick={handleSend}
            >
              {sending ? "Enviando…" : sendError ? "Reintentar envío" : "Enviar (simulación)"}
            </Button>
            {sending && (
              <p role="status" className="f2-support mt-3 text-f2-muted">
                Enviando tu consulta de demostración…
              </p>
            )}
          </div>
        </div>
      )}

      {submitted && (
        <div ref={tailRef} tabIndex={-1} aria-labelledby="bubble-pass" className="mt-6 space-y-4 outline-none">
          <BotBubble
            id="bubble-pass"
            text="Tu consulta quedó registrada (simulación)."
            detail="No se envió nada: esto es un ejemplo de cómo se vería."
          />
          <div className="pl-9">
            <DigitalPass
              institutionName={state.institution.name}
              episodeCode={state.submission.episodeCode ?? "DEMO-0000-FICT"}
              patientName={patientName || undefined}
            />
          </div>
          <BotBubble
            text="Mostrá este pase en admisión y esperá en la sala."
            detail="Si te sentís peor mientras esperás, avisá al personal enseguida."
          />
          <div className="pl-9">
            <Notice variant="info" title="Qué no es este pase">
              No representa un turno ni una prioridad clínica, y no define el orden de atención. Quien te
              evalúa es el equipo de la institución.
            </Notice>
            <div className="mt-4">
              <Button
                variant="secondary"
                iconLeft={<RotateCcw className="size-5" aria-hidden="true" />}
                onClick={() => setConfirmRestart(true)}
              >
                Empezar de nuevo
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRestart}
        title="¿Empezar de nuevo?"
        description="Se borran las respuestas y los datos de ejemplo de esta demostración."
        confirmLabel="Empezar de nuevo"
        cancelLabel="Seguir viendo el pase"
        destructive
        onConfirm={restart}
        onCancel={() => setConfirmRestart(false)}
      />
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </PatientShell>
  );
}
