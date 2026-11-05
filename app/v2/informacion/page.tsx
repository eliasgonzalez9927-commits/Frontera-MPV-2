import type { Metadata } from "next";
import { BeforeStartScreen } from "@/components/v2/screens/BeforeStartScreen";

export const metadata: Metadata = { title: "Antes de comenzar — Frontera 2.0" };

export default function Page() {
  return <BeforeStartScreen />;
}
