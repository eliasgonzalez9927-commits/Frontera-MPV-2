import type { Metadata } from "next";
import { DesignSystemGallery } from "@/components/v2/demo/DesignSystemGallery";

export const metadata: Metadata = { title: "Design system — Frontera 2.0" };

export default function DesignSystemPage() {
  return <DesignSystemGallery />;
}
