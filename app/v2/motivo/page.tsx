import type { Metadata } from "next";
import { ComplaintScreen } from "@/components/v2/screens/ComplaintScreen";

export const metadata: Metadata = { title: "Motivo de consulta — Frontera 2.0" };

export default function Page() {
  return <ComplaintScreen />;
}
