import type { Metadata } from "next";
import { EmergencyScreen } from "@/components/v2/screens/ExceptionScreens";

export const metadata: Metadata = { title: "Simulación de emergencia — Frontera" };

export default function Page() {
  return <EmergencyScreen place="inside" />;
}
