import type { ToolDefinition } from "../types";

const MB = 2 ** 20;
const GB = 2 ** 30;

export const meta: ToolDefinition = {
  slug: "hash-generator",
  category: "developer",
  status: "live",
  name: "Hash Generator",
  tagline:
    "Get SHA-256, MD5, SHA-1, SHA-384 and SHA-512 hashes or HMACs of text and files, and verify checksums. Nothing is uploaded.",
  icon: "hash",
  keywords: [
    "sha256 hash",
    "md5 hash",
    "checksum calculator",
    "sha1",
    "sha512",
    "hmac generator",
    "file checksum",
    "verify checksum",
  ],
  seo: {
    title: "Hash Generator: SHA-256, MD5, SHA-1, SHA-512 | Sprigkit",
    description:
      "Hash text or files with SHA-256, MD5, SHA-1, SHA-384 and SHA-512, or compute an HMAC. Verify a download’s checksum. Files never leave your device.",
    h1: "Hash generator: SHA-256, MD5, SHA-1, SHA-512",
    faqs: [
      {
        q: "How do I verify a file checksum?",
        a: "Select Open file and choose the file, then paste the checksum from the download page into “Compare with expected hash”. The tool tells you which algorithm matches, or that none does. Case, spaces and a prefix such as “sha256:” don’t matter. Large files are read in chunks in a background thread, so even multi-gigabyte files work without filling memory.",
      },
      {
        q: "Can a SHA-256 or MD5 hash be decrypted?",
        a: "No. A hash isn’t encryption: it’s a one-way fingerprint, and the original data can’t be calculated from it. Sites that claim to “decrypt” hashes look them up in tables of common passwords and phrases. That works for short, common inputs, which is why passwords need slow, salted algorithms such as Argon2 or bcrypt rather than a plain hash.",
      },
      {
        q: "Is MD5 secure?",
        a: "Not for security. Researchers can create two different files with the same MD5 (and SHA-1) hash, so they must not be used for passwords, signatures or certificates. They are still fine for detecting accidental changes, such as a corrupted download, and many sites publish them as checksums. Use SHA-256 or stronger for anything security-related.",
      },
      {
        q: "What is HMAC?",
        a: "HMAC combines a hash with a secret key, so only someone with the key can produce or check the value. APIs use it to sign requests and webhooks (for example HMAC-SHA256). Turn on HMAC, enter the key, and the output is the HMAC of your text or file. The key stays in the page’s memory and is never stored.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Hashing runs in your browser, on your device; files are read in chunks and never leave it. Nothing you enter, including the HMAC key, is stored or put in the URL, and the site’s security policy blocks the page from sending data to other servers.",
      },
    ],
  },
  related: ["base64-encode-decode", "uuid-generator", "jwt-decoder", "diff-checker"],
  input: {
    kind: "both",
    accepts: { mime: ["*/*"], extensions: [".bin"], multiple: false },
  },
  limits: {
    // Files are streamed, so memory doesn't limit size; the limit keeps waits reasonable.
    desktop: { softBytes: 1 * GB, hardBytes: 8 * GB },
    mobile: { softBytes: 500 * MB, hardBytes: 2 * GB },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
