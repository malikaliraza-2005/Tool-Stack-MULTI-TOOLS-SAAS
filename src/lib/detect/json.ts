import type { Detector } from "./types";

// Above this size, parsing to detect would break the ≤ 1 ms budget; the
// bracket shape is enough evidence for a paste that large.
const PARSE_LIMIT = 256 * 1024;

/** Trimmed text starts with `{` or `[` and parses (tool-registry §5). */
export const jsonDetector: Detector = {
  id: "json",
  detect(text) {
    const trimmed = text.trim();
    const open = trimmed[0];
    const close = trimmed[trimmed.length - 1];
    if (!((open === "{" && close === "}") || (open === "[" && close === "]"))) return 0;
    if (trimmed.length > PARSE_LIMIT) return 0.6;
    try {
      const value: unknown = JSON.parse(trimmed);
      // An empty object or array is valid JSON but weak evidence of intent.
      const empty = Array.isArray(value)
        ? value.length === 0
        : Object.keys(value ?? {}).length === 0;
      return empty ? 0.5 : 0.95;
    } catch {
      return 0;
    }
  },
};
