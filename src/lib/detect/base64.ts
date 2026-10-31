import type { Detector } from "./types";

const MIN_LENGTH = 16;
// Only this many characters are decoded to judge the content (a multiple of
// 4), so large pastes stay within the ≤ 1 ms budget.
const SAMPLE = 1024;

/**
 * Base64 alphabet (standard or URL-safe), valid padding and length, at least
 * 16 characters, and decodes to mostly printable text or a known file type
 * (tool-registry §5). Data URLs with ;base64 match too.
 */
export const base64Detector: Detector = {
  id: "base64",
  detect(text) {
    let body = text.trim();
    const dataUrl = /^data:[\w.+-]+\/[\w.+-]+(?:;[\w-]+=[\w.-]+)*;base64,/i.exec(body);
    if (dataUrl) body = body.slice(dataUrl[0].length);
    body = body.replace(/\r?\n/g, "");
    if (body.length < MIN_LENGTH) return 0;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body) && !/^[A-Za-z0-9_-]+$/.test(body)) return 0;
    const padded = body.endsWith("=");
    if (padded ? body.length % 4 !== 0 : body.length % 4 === 1) return 0;

    let bytes: Uint8Array;
    try {
      const sample = body.slice(0, SAMPLE).replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
      const usable = sample.slice(0, sample.length - (sample.length % 4 === 1 ? 1 : 0));
      const binary = atob(usable.padEnd(Math.ceil(usable.length / 4) * 4, "="));
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      return 0;
    }
    if (dataUrl || hasKnownMagic(bytes)) return 0.9;
    return printableRatio(bytes) >= 0.95 ? 0.7 : 0;
  },
};

function hasKnownMagic(bytes: Uint8Array): boolean {
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  return (
    starts(0x89, 0x50, 0x4e, 0x47) || // PNG
    starts(0xff, 0xd8, 0xff) || // JPEG
    starts(0x47, 0x49, 0x46, 0x38) || // GIF
    starts(0x25, 0x50, 0x44, 0x46, 0x2d) || // %PDF-
    starts(0x50, 0x4b, 0x03, 0x04) || // ZIP
    starts(0x1f, 0x8b) || // gzip
    (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) // RIFF…WEBP
  );
}

/** Share of the decoded text that is printable (UTF-8 aware). */
function printableRatio(bytes: Uint8Array): number {
  // The sample may end inside a multi-byte character; non-fatal decoding marks it with U+FFFD.
  const text = new TextDecoder().decode(bytes);
  if (text.length === 0) return 0;
  let printable = 0;
  let total = 0;
  // By UTF-16 unit; a surrogate pair counts once, as its high half.
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    total++;
    if (code === 0xfffd) continue;
    if (
      code >= 0x20
        ? code !== 0x7f && (code < 0x80 || code > 0x9f)
        : code === 9 || code === 10 || code === 13
    ) {
      printable++;
    }
  }
  return printable / total;
}
