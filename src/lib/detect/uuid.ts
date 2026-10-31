import type { Detector } from "./types";

// 8-4-4-4-12 hex with an RFC 9562 version (1–8) and variant (10xx), optionally
// in braces or as urn:uuid:.
const RFC_9562 =
  /^(?:urn:uuid:)?\{?[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}?$/i;
const NIL_OR_MAX = /^(?:0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i;

/** RFC 9562 UUID format (tool-registry §5). */
export const uuidDetector: Detector = {
  id: "uuid",
  detect(text) {
    const trimmed = text.trim();
    if (trimmed.length > 45) return 0;
    if (RFC_9562.test(trimmed)) return 0.95;
    return NIL_OR_MAX.test(trimmed) ? 0.8 : 0;
  },
};
