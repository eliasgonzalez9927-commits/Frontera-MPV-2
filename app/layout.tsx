import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frontera — Pre-triaje digital para urgencias",
  description:
    "Frontera ayuda a ordenar la urgencia antes de que el sistema colapse.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
