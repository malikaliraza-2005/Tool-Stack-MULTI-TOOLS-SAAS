// Motion tokens for Motion for React (design-system §7). The CSS tokens in
// src/styles/globals.css are the source of truth; tokens.test.ts keeps these
// values in sync with them.

/** Durations in seconds (Motion's unit). */
export const duration = {
  instant: 0.1,
  quick: 0.18,
  standard: 0.26,
  page: 0.38,
  exit: 0.12,
} as const;

/** Cubic-bezier control points. */
export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.55, 0, 1, 0.45],
} as const;

/** Direct manipulation only: drag, reorder (§7.2). */
export const spring = { type: "spring", stiffness: 500, damping: 40, mass: 1 } as const;

/** Moving between two on-screen positions, e.g. sliding indicators. */
export const slide = { duration: duration.standard, ease: ease.inOut } as const;

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
