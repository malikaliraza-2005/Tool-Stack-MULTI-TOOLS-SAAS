import type { Detector } from "./types";

const SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
// A header is small; longer first segments aren't worth decoding.
const MAX_HEADER = 2048;

/**
 * Three base64url segments separated by dots, and the header decodes to a
 * JSON object with `alg` (tool-registry §5). A "Bearer " prefix is allowed.
 */
export const jwtDetector: Detector = {
  id: "jwt",
  detect(text) {
    const token = text.trim().replace(/^Bearer\s+/i, "");
    if (!SHAPE.test(token)) return 0;
    const header = token.slice(0, token.indexOf("."));
    if (header.length > MAX_HEADER || header.length % 4 === 1) return 0;
    try {
      const json = atob(
        header
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(Math.ceil(header.length / 4) * 4, "="),
      );
      const parsed: unknown = JSON.parse(json);
      return parsed !== null &&
        typeof parsed === "object" &&
        typeof (parsed as { alg?: unknown }).alg === "string"
        ? 0.98
        : 0;
    } catch {
      return 0;
    }
  },
};
