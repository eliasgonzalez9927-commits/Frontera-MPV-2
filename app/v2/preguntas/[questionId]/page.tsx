import type { Metadata } from "next";
import { QuestionScreen } from "@/components/v2/screens/QuestionScreen";
import { questionnaires } from "@/lib/v2/questionnaires";

export const metadata: Metadata = { title: "Pregunta — Frontera 2.0" };

// Los ids de pregunta son únicos entre recorridos, así que se pregeneran todos.
export function generateStaticParams() {
  return Object.values(questionnaires).flatMap((q) => Object.keys(q.steps).map((questionId) => ({ questionId })));
}

export default async function Page({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  // key: al cambiar de pregunta se reinicia el estado local (errores, diálogo pendiente).
  return <QuestionScreen key={questionId} stepId={questionId} />;
}
