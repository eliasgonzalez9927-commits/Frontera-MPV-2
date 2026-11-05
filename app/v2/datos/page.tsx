import type { Metadata } from "next";
import { IdentificationScreen } from "@/components/v2/screens/IdentificationScreen";

export const metadata: Metadata = { title: "Datos del paciente — Frontera 2.0" };

export default function Page() {
  return <IdentificationScreen />;
}
