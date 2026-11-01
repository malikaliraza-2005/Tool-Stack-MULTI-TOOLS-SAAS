// In-memory hand-off of input to another tool (architecture §9): homepage
// drop suggestions (G-2), smart paste (G-3) and "Use in another tool" (G-11).
// A module variable survives client-side navigation and nothing else: after
// a reload the user chooses the file again. Never persisted, never in the URL.

export type Handoff = {
  files?: File[];
  text?: string;
  /** What produced it: a smart-paste detector id or the source tool's slug. */
  source?: string;
};

let pending: { slug: string; payload: Handoff } | null = null;

/** Keeps the input for `slug`; call it right before navigating there. */
export function handOff(slug: string, payload: Handoff): void {
  pending = { slug, payload };
}

/** Returns and clears the input waiting for `slug`, if any. */
export function takeHandoff(slug: string): Handoff | undefined {
  if (pending?.slug !== slug) return undefined;
  const { payload } = pending;
  pending = null;
  return payload;
}

export function clearHandoff(): void {
  pending = null;
}
