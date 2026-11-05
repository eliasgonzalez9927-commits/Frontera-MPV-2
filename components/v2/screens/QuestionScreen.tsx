"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNextAfterQuestion, getPreviousBeforeQuestion, getQuestionGuardRedirect } from "@/lib/v2/flow/routes";
import { getPath, pruneOrphanAnswers } from "@/lib/v2/questionnaires/engine";
import { questionnaireForState } from "@/lib/v2/questionnaires";
import type { Answers, AnswerValue } from "@/lib/v2/questionnaires/types";
import { isEmptyAnswer, validateAnswer } from "@/lib/v2/questionnaires/validation";
import { useFlowNavigation } from "../flow/useFlowScreen";
import { QuestionRenderer } from "../questions/QuestionRenderer";
import { ActionFooter } from "../ui/ActionFooter";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { PatientShell } from "../ui/PatientShell";
import { StageProgress } from "../ui/StageProgress";

// P05 — Una pregunta por pantalla. Renderiza cualquier recorrido a partir de su definición.
export function QuestionScreen({ stepId }: { stepId: string }) {
  const router = useRouter();
  const { state, dispatch, continueTo, backTo } = useFlowNavigation();
  const [showError, setShowError] = useState(false);
  const [pending, setPending] = useState<{ pruned: Answers; removed: string[] } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const questionnaire = questionnaireForState(state);
  const redirect = getQuestionGuardRedirect(state, stepId);

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (redirect) return null;

  const question = questionnaire.steps[stepId];
  const value = state.answers[stepId];
  const path = getPath(questionnaire, state.answers);
  const position = path.indexOf(stepId) + 1;
  const error = showError ? validateAnswer(question, value) : null;
  const canSkip = !question.required && question.type !== "info" && isEmptyAnswer(value);

  function setAnswer(next: AnswerValue | null) {
    dispatch({ type: "setAnswer", id: stepId, value: next });
  }

  function goNextWith(answers: Answers) {
    // Con el estado ya podado y esta pregunta como "vista": en modo edición, lo pendiente se
    // calcula sobre este estado, que todavía no se reflejó en el render.
    const nextState = { ...state, answers, seen: { ...state.seen, [stepId]: true as const } };
    dispatch({ type: "markSeen", id: stepId });
    continueTo(getNextAfterQuestion(nextState, stepId), nextState);
  }

  function handleContinue() {
    if (validateAnswer(question, value) !== null) {
      setShowError(true);
      areaRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
      return;
    }

    // Si esta respuesta cambió el recorrido, hay respuestas posteriores que ya no aplican.
    const { answers: pruned, removed } = pruneOrphanAnswers(questionnaire, state.answers);
    if (removed.length > 0) {
      setPending({ pruned, removed });
      return;
    }
    goNextWith(state.answers);
  }

  function confirmPrune() {
    if (!pending) return;
    dispatch({ type: "replaceAnswers", answers: pending.pruned, removed: pending.removed });
    goNextWith(pending.pruned);
    setPending(null);
  }

  return (
    <PatientShell
      onBack={backTo(getPreviousBeforeQuestion(state, stepId))}
      progress={<StageProgress current="preguntas" />}
      footer={
        <ActionFooter>
          <Button
            variant={canSkip ? "secondary" : "primary"}
            iconRight={canSkip ? undefined : <ArrowRight className="size-5" aria-hidden="true" />}
            onClick={handleContinue}
          >
            {canSkip ? "Omitir" : "Continuar"}
          </Button>
        </ActionFooter>
      }
    >
      <p className="mb-5">
        <span className="f2-label block text-f2-ink">
          Paso {position} de {path.length}
        </span>
        <span className="f2-support block text-f2-muted">Recorrido de demostración: {questionnaire.name}</span>
      </p>

      <div ref={areaRef} className="f2-enter">
        <QuestionRenderer question={question} value={value} error={error ?? undefined} onChange={setAnswer} />
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Esto cambia las preguntas que siguen"
        description={`Si continuás con esta respuesta, se van a descartar ${pending?.removed.length ?? 0} respuesta(s) que ya habías cargado y que dejan de aplicar.`}
        confirmLabel="Continuar y descartar"
        cancelLabel="Revisar mi respuesta"
        destructive
        onConfirm={confirmPrune}
        onCancel={() => setPending(null)}
      />
    </PatientShell>
  );
}
