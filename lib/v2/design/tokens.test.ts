import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { f2Colors, f2ProvisionalMuted, toCssVar } from "./tokens";

const c = f2Colors;

describe("f2 tokens — sincronía con tokens.css", () => {
  const css = readFileSync(join(process.cwd(), "app/v2/tokens.css"), "utf8");

  it.each(Object.entries(f2Colors))("%s coincide con su CSS custom property", (token, hex) => {
    const match = css.match(new RegExp(`${toCssVar(token)}:\\s*(#[0-9a-fA-F]{6})`));
    expect(match, `falta ${toCssVar(token)} en tokens.css`).not.toBeNull();
    expect(match![1].toLowerCase()).toBe(hex.toLowerCase());
  });
});

describe("f2 tokens — contraste de texto (AA >= 4.5:1)", () => {
  const textPairs: Array<[string, string, string]> = [
    ["ink sobre bg", c.ink, c.bg],
    ["ink sobre surface", c.ink, c.surface],
    ["muted sobre bg", c.muted, c.bg],
    ["muted sobre surface", c.muted, c.surface],
    ["brand sobre bg", c.brand, c.bg],
    ["brand sobre surface", c.brand, c.surface],
    ["brand sobre brandSoft", c.brand, c.brandSoft],
    ["ink sobre brandSoft", c.ink, c.brandSoft],
    ["blanco sobre brand", c.surface, c.brand],
    ["blanco sobre brandHover", c.surface, c.brandHover],
    ["danger sobre surface", c.danger, c.surface],
    ["danger sobre dangerSoft", c.danger, c.dangerSoft],
    ["blanco sobre danger", c.surface, c.danger],
    ["warn sobre warnSoft", c.warn, c.warnSoft],
  ];

  it.each(textPairs)("%s", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("documenta por qué se ajustó el gris neutro provisional", () => {
    expect(contrastRatio(f2ProvisionalMuted, c.bg)).toBeLessThan(4.5);
  });
});

describe("f2 tokens — contraste de componentes (WCAG 1.4.11 >= 3:1)", () => {
  it.each([
    ["borde de control sobre surface", c.control, c.surface],
    ["borde de control sobre bg", c.control, c.bg],
    ["anillo de foco (brand) sobre surface", c.brand, c.surface],
    ["anillo de foco (brand) sobre bg", c.brand, c.bg],
  ])("%s", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
