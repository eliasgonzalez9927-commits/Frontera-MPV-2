import type { ScaleQuestion } from "@/lib/v2/questionnaires/types";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { ScaleInput } from "../ui/ScaleInput";
import type { QuestionViewProps } from "./types";

export function ScaleQuestionView({ question, value, error, onChange }: QuestionViewProps<ScaleQuestion>) {
  return (
    <ChoiceGroup legend={question.title} description={question.description} required={question.required} optional={!question.required} error={error}>
      <ScaleInput
        name={question.id}
        min={question.min}
        max={question.max}
        value={typeof value === "number" ? value : null}
        onChange={onChange}
        minLabel={question.minLabel}
        maxLabel={question.maxLabel}
        invalid={Boolean(error)}
      />
    </ChoiceGroup>
  );
}
