import type { Metadata } from "next";
import { ReviewScreen } from "@/components/v2/screens/ReviewScreen";

export const metadata: Metadata = { title: "Revisión — Frontera 2.0" };

export default function Page() {
  return <ReviewScreen />;
}
