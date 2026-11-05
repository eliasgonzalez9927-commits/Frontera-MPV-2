import { toggleMultiple } from "@/lib/v2/questionnaires/selection";
import type { MultipleQuestion } from "@/lib/v2/questionnaires/types";
import { ChoiceCard } from "../ui/ChoiceCard";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import type { QuestionViewProps } from "./types";

export function MultipleQuestionView({ question, value, error, onChange }: QuestionViewProps<MultipleQuestion>) {
  const selected = Array.isArray(value) ? value : [];

  return (
    <ChoiceGroup legend={question.title} description={question.description} required={question.required} optional={!question.required} error={error}>
      {question.options.map((option) => (
        <ChoiceCard
          key={option.id}
          type="checkbox"
          name={question.id}
          value={option.id}
          label={option.label}
          description={option.description}
          checked={selected.includes(option.id)}
          invalid={Boolean(error)}
          onChange={(checked) => {
            const next = toggleMultiple(question, selected, option.id, checked);
            onChange(next.length > 0 ? next : null);
          }}
        />
      ))}
    </ChoiceGroup>
  );
}
