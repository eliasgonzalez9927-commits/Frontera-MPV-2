import type { Metadata } from "next";
import { PausedScreen } from "@/components/v2/screens/ExceptionScreens";

export const metadata: Metadata = { title: "Consulta en pausa — Frontera" };

export default function Page() {
  return <PausedScreen />;
}
