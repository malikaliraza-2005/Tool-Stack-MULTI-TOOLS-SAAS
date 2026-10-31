// Digest formatting and comparison: no hashing library, so the UI can import
// it eagerly.

import { ALGORITHMS, type Algorithm, type OutputFormat } from "./constants";

export type Digests = Partial<Record<Algorithm, Uint8Array>>;

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += HEX[byte];
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function formatDigest(bytes: Uint8Array, format: OutputFormat): string {
  if (format === "base64") return toBase64(bytes);
  const hex = toHex(bytes);
  return format === "HEX" ? hex.toUpperCase() : hex;
}

/**
 * Which algorithm's digest equals `expected`: hex compared case-insensitively,
 * Base64 exactly; spaces, line breaks and a "sha256:" style prefix ignored.
 * Null when none matches.
 */
export function findMatch(expected: string, digests: Digests): Algorithm | null {
  const cleaned = expected.replace(/\s+/g, "").replace(/^(?:md5|sha-?(?:1|256|384|512)):/i, "");
  if (cleaned === "") return null;
  for (const algorithm of ALGORITHMS) {
    const bytes = digests[algorithm];
    if (!bytes) continue;
    if (cleaned.toLowerCase() === toHex(bytes) || cleaned === toBase64(bytes)) return algorithm;
  }
  return null;
}
