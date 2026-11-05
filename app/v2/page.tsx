import type { Metadata } from "next";
import { WelcomeScreen } from "@/components/v2/screens/WelcomeScreen";

export const metadata: Metadata = { title: "Bienvenida — Frontera 2.0" };

export default function Page() {
  return <WelcomeScreen />;
}
