import { effectiveScenario, type DemoScenarioId, type FlowState } from "../flow/state";
import { abdominal, musculoskeletal, unidentified } from "./definitions";
import type { Questionnaire } from "./types";

export const questionnaires: Record<DemoScenarioId, Questionnaire> = {
  musculoskeletal,
  abdominal,
  unidentified,
};

export function questionnaireForState(state: Pick<FlowState, "demoScenario">): Questionnaire {
  return questionnaires[effectiveScenario(state)];
}
