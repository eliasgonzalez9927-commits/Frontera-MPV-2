import { ConfirmQuestionView } from "./ConfirmQuestionView";
import { InfoQuestionView } from "./InfoQuestionView";
import { MultipleQuestionView } from "./MultipleQuestionView";
import { ScaleQuestionView } from "./ScaleQuestionView";
import { SingleQuestionView } from "./SingleQuestionView";
import { TextQuestionView } from "./TextQuestionView";
import type { QuestionViewProps } from "./types";

// Despacha por tipo de pregunta. Es el único lugar que conoce todos los tipos.
export function QuestionRenderer(props: QuestionViewProps) {
  const { question } = props;

  switch (question.type) {
    case "single":
      return <SingleQuestionView {...props} question={question} />;
    case "multiple":
      return <MultipleQuestionView {...props} question={question} />;
    case "text":
      return <TextQuestionView {...props} question={question} />;
    case "scale":
      return <ScaleQuestionView {...props} question={question} />;
    case "confirm":
      return <ConfirmQuestionView {...props} question={question} />;
    case "info":
      return <InfoQuestionView {...props} question={question} />;
  }
}
