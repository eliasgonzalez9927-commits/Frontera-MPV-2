import type { Metadata } from "next";
import { UnavailableScreen } from "@/components/v2/screens/ExceptionScreens";

export const metadata: Metadata = { title: "Institución no disponible — Frontera" };

export default function Page() {
  return <UnavailableScreen />;
}
