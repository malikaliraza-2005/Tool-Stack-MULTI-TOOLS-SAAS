import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { duration, ease } from "@/lib/motion";
import { THEME_BG } from "@/lib/theme";

// Verifies the design tokens in globals.css (design-system §2, §7, §9):
// WCAG 2.2 contrast of every text/background and UI-boundary pair in both
// themes, and that the TypeScript mirrors of tokens match the CSS.

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing block ${selector}`);
  return css.slice(start, css.indexOf("\n}", start));
}

type Oklch = [number, number, number];

function colors(selector: string): Record<string, Oklch> {
  const result: Record<string, Oklch> = {};
  for (const match of block(selector).matchAll(
    /--([\w-]+):\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/g,
  )) {
    const [, name, l, c, h] = match;
    result[name!] = [Number(l), Number(c), Number(h)];
  }
  return result;
}

const themes = {
  light: colors(":root,\n.light"),
  dark: colors(".dark"),
};

/** OKLCH → linear sRGB (gamut-clipped) → WCAG relative luminance. */
function luminance([l, c, h]: Oklch): number {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (x: number) => Math.min(1, Math.max(0, x));
  const r = clip(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = clip(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const bl = clip(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const UI = 3;

// [foreground, background, minimum ratio, where the pair is used]
const PAIRS: [string, string, number, string][] = [
  ...["bg", "surface", "surface-2", "surface-3"].flatMap(
    (bg): [string, string, number, string][] => [
      ["fg", bg, TEXT, "body text"],
      ["fg-muted", bg, TEXT, "secondary text"],
    ],
  ),
  ["fg-subtle", "bg", TEXT, "placeholder / helper text"],
  ["fg-subtle", "surface", TEXT, "placeholder / helper text"],
  ["fg-subtle", "surface-2", TEXT, "input placeholder"],
  ["accent-text", "bg", TEXT, "links"],
  ["accent-text", "surface", TEXT, "links in panels"],
  ["accent-text", "surface-2", TEXT, "selected menu check"],
  ["accent-text", "accent-soft", TEXT, "accent badge"],
  ["fg", "accent-soft", TEXT, "selected rows, highlights"],
  ["accent-fg", "accent", TEXT, "primary button"],
  ["accent-fg", "accent-hover", TEXT, "primary button hover"],
  ["danger-fg", "danger", TEXT, "danger button"],
  ["danger-fg", "danger-hover", TEXT, "danger button hover"],
  ["bg", "fg", TEXT, "tooltip (inverted)"],
  ...(["success", "warning", "danger", "info"] as const).flatMap(
    (status): [string, string, number, string][] => [
      [status, "bg", TEXT, `${status} text`],
      [status, "surface", TEXT, `${status} text in panels`],
      [status, `${status}-soft`, TEXT, `${status} badge / toast`],
      ["fg", `${status}-soft`, TEXT, `text on ${status} background`],
    ],
  ),
  ["accent", "bg", UI, "focus ring, active indicators, progress"],
  ["accent", "surface", UI, "focus ring on panels"],
  ["accent", "surface-2", UI, "focus ring on inputs"],
  ["border-strong", "bg", UI, "input / checkbox / switch boundary"],
  ["border-strong", "surface", UI, "input / checkbox boundary on panels"],
  ["border-strong", "surface-2", UI, "input boundary vs its fill"],
  ["danger", "surface-2", UI, "invalid input border"],
];

describe.each(Object.entries(themes))("%s theme contrast (WCAG 2.2 AA)", (_theme, tokens) => {
  it.each(PAIRS)("%s on %s ≥ %s (%s)", (fg, bg, min) => {
    const a = tokens[fg];
    const b = tokens[bg];
    expect(a, `--${fg}`).toBeDefined();
    expect(b, `--${bg}`).toBeDefined();
    expect(contrast(a!, b!)).toBeGreaterThanOrEqual(min);
  });
});

describe("token mirrors", () => {
  it("defines the same color tokens in both themes", () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  it("motion durations match globals.css", () => {
    const root = css.slice(css.indexOf("/* Theme-independent tokens. */"));
    for (const [name, seconds] of Object.entries(duration)) {
      const match = root.match(new RegExp(`--dur-${name}: (\\d+)ms;`));
      expect(match, `--dur-${name}`).not.toBeNull();
      expect(Number(match![1]) / 1000).toBe(seconds);
    }
  });

  it("easing curves match globals.css", () => {
    const names = { out: "out", inOut: "in-out", in: "in" } as const;
    for (const [key, cssName] of Object.entries(names)) {
      const match = css.match(new RegExp(`--ease-${cssName}: cubic-bezier\\(([^)]+)\\);`));
      expect(match, `--ease-${cssName}`).not.toBeNull();
      expect(match![1]!.split(",").map(Number)).toEqual([...ease[key as keyof typeof ease]]);
    }
  });

  it("theme-color meta values match --bg", () => {
    expect(block(":root,\n.light")).toContain(`--bg: ${THEME_BG.light};`);
    expect(block(".dark")).toContain(`--bg: ${THEME_BG.dark};`);
  });

  it("keeps every duration within the 380ms motion limit", () => {
    for (const seconds of Object.values(duration)) expect(seconds).toBeLessThanOrEqual(0.38);
  });
});
