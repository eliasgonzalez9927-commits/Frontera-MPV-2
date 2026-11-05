import type { ConfirmQuestion } from "@/lib/v2/questionnaires/types";
import { ChoiceCard } from "../ui/ChoiceCard";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import type { QuestionViewProps } from "./types";

export function ConfirmQuestionView({ question, value, error, onChange }: QuestionViewProps<ConfirmQuestion>) {
  return (
    <ChoiceGroup legend={question.title} description={question.description} required={question.required} optional={!question.required} error={error}>
      <ChoiceCard
        type="checkbox"
        name={question.id}
        value="confirm"
        label={question.confirmLabel}
        checked={value === true}
        invalid={Boolean(error)}
        onChange={(checked) => onChange(checked ? true : null)}
      />
    </ChoiceGroup>
  );
}
