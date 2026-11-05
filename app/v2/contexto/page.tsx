import type { Metadata } from "next";
import { ContextScreen } from "@/components/v2/screens/ContextScreen";

export const metadata: Metadata = { title: "¿Para quién es la consulta? — Frontera 2.0" };

export default function Page() {
  return <ContextScreen />;
}
