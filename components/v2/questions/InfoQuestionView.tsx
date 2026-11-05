import { Info } from "lucide-react";
import type { InfoQuestion } from "@/lib/v2/questionnaires/types";
import type { QuestionViewProps } from "./types";

// Información contextual: se lee y se continúa. No tiene respuesta.
export function InfoQuestionView({ question }: QuestionViewProps<InfoQuestion>) {
  return (
    <div>
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-f2-brand-soft text-f2-brand"
      >
        <Info className="size-6" />
      </span>
      <h1 className="f2-question mt-5 text-f2-ink">{question.title}</h1>
      {question.body && <p className="f2-body mt-3 text-f2-muted">{question.body}</p>}
    </div>
  );
}
