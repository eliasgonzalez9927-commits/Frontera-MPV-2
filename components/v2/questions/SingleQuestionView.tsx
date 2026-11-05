import type { SingleQuestion } from "@/lib/v2/questionnaires/types";
import { ChoiceCard } from "../ui/ChoiceCard";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import type { QuestionViewProps } from "./types";

export function SingleQuestionView({ question, value, error, onChange }: QuestionViewProps<SingleQuestion>) {
  return (
    <ChoiceGroup legend={question.title} description={question.description} required={question.required} optional={!question.required} error={error}>
      {question.options.map((option) => (
        <ChoiceCard
          key={option.id}
          type="radio"
          name={question.id}
          value={option.id}
          label={option.label}
          description={option.description}
          checked={value === option.id}
          invalid={Boolean(error)}
          onChange={() => onChange(option.id)}
        />
      ))}
    </ChoiceGroup>
  );
}
