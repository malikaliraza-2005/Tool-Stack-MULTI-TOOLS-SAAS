import type { Detector } from "./types";

// Longer pastes are documents that contain URLs, not a URL to parse.
const MAX_LENGTH = 8 * 1024;

/** Parses with `new URL()` and has an http(s) scheme (tool-registry §5). */
export const urlDetector: Detector = {
  id: "url",
  detect(text) {
    const trimmed = text.trim();
    if (trimmed.length > MAX_LENGTH || !/^https?:\/\/\S+$/i.test(trimmed)) return 0;
    try {
      return new URL(trimmed).hostname ? 0.9 : 0;
    } catch {
      return 0;
    }
  },
};

const ESCAPE = /%[0-9A-Fa-f]{2}/;
// Decoding more than this would break the ≤ 1 ms budget; the start is enough evidence.
const SAMPLE = 4 * 1024;

/** Contains `%XX` sequences and decodes cleanly (tool-registry §5). */
export const urlEncodedDetector: Detector = {
  id: "url-encoded",
  detect(text) {
    const trimmed = text.trim();
    if (!ESCAPE.test(trimmed)) return 0;
    const cut = trimmed.length > SAMPLE;
    let sample = trimmed.slice(0, SAMPLE);
    // A cut sample may end inside an escape or a multi-byte character (up to
    // 3 bytes of a 4-byte one): drop those before deciding it doesn't decode.
    if (cut) sample = sample.replace(/%[0-9A-Fa-f]?$/, "");
    for (let dropped = 0; ; dropped++) {
      try {
        decodeURIComponent(sample);
        break;
      } catch {
        if (!cut || dropped === 3) return 0;
        sample = sample.replace(/%[0-9A-Fa-f]{2}$/, "");
      }
    }
    // Several escapes and no spaces: a value someone encoded on purpose.
    const escapes = sample.match(/%[0-9A-Fa-f]{2}/g)?.length ?? 0;
    return escapes >= 2 && !/\s/.test(trimmed) ? 0.8 : 0.6;
  },
};
