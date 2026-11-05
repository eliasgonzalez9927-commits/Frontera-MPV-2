import type { TextQuestion } from "@/lib/v2/questionnaires/types";
import { TextArea } from "../ui/TextField";
import type { QuestionViewProps } from "./types";

export function TextQuestionView({ question, value, error, onChange }: QuestionViewProps<TextQuestion>) {
  return (
    <TextArea
      variant="question"
      label={question.title}
      hint={question.description}
      placeholder={question.placeholder}
      optional={!question.required}
      value={typeof value === "string" ? value : ""}
      maxLength={question.validation?.maxLength}
      showCount={Boolean(question.validation?.maxLength)}
      error={error}
      className="min-h-36"
      onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
    />
  );
}
