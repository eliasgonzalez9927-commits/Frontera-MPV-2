// Frontera 2.0 — design tokens (fuente de verdad para la galería y los tests).
// Los mismos valores viven como CSS custom properties en app/v2/tokens.css;
// tokens.test.ts verifica que ambos lados no se desincronicen.

export const f2Colors = {
  bg: "#F6F8F7",
  surface: "#FFFFFF",
  ink: "#16312F",
  // El gris provisional #667976 da 4.32:1 sobre bg (< 4.5 AA). Este es el ajuste mínimo.
  muted: "#5A6C69",
  brand: "#0C655D",
  brandHover: "#0A5149",
  brandSoft: "#E7F1EF",
  border: "#DDE5E3",
  // Borde de controles interactivos: >= 3:1 (WCAG 1.4.11).
  control: "#7F908D",
  danger: "#B42318",
  dangerSoft: "#FEF3F2",
  dangerBorder: "#F4B5AE",
  warn: "#7A4B00",
  warnSoft: "#FFF6E5",
  warnBorder: "#F1D08A",
} as const;

export type F2ColorToken = keyof typeof f2Colors;

// Valor provisional recibido en el brief, solo como referencia documentada.
export const f2ProvisionalMuted = "#667976";

export function toCssVar(token: string) {
  return `--f2-${token.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}
