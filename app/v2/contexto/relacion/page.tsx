import type { Metadata } from "next";
import { RelationScreen } from "@/components/v2/screens/RelationScreen";

export const metadata: Metadata = { title: "Persona para la que respondés — Frontera 2.0" };

export default function Page() {
  return <RelationScreen />;
}
