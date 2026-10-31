// Light values the UI needs eagerly; the hashing library (logic.ts) loads on
// the first input.

export const ALGORITHMS = ["md5", "sha1", "sha256", "sha384", "sha512"] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

export const ALGORITHM_NAMES: Record<Algorithm, string> = {
  md5: "MD5",
  sha1: "SHA-1",
  sha256: "SHA-256",
  sha384: "SHA-384",
  sha512: "SHA-512",
};

/** Broken for security use: collisions can be made (§5.9 labels). */
export const WEAK: readonly Algorithm[] = ["md5", "sha1"];

export type OutputFormat = "hex" | "HEX" | "base64";

export const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";
