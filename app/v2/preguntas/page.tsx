import type { Metadata } from "next";
import { QuestionsIndexScreen } from "@/components/v2/screens/QuestionsIndexScreen";

export const metadata: Metadata = { title: "Preguntas — Frontera 2.0" };

export default function Page() {
  return <QuestionsIndexScreen />;
}
