import type { Metadata } from "next";
import { PassScreen } from "@/components/v2/screens/PassScreen";

export const metadata: Metadata = { title: "Pase digital — Frontera 2.0" };

export default function Page() {
  return <PassScreen />;
}
