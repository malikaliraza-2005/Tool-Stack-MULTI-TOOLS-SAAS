// URL encoding, decoding and parsing (tool-specifications §5.4). Pure
// functions: no DOM, no React. Small enough to run on the main thread.

/** Where in the input a problem is (1-based line and column). */
export type InputError = { message: string; line: number; column: number; offset: number };

export type TextResult = { ok: true; output: string } | { ok: false; error: InputError };

/** 1-based line and column of `offset` in `text`. */
export function locate(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

function fail(text: string, offset: number, message: string): { ok: false; error: InputError } {
  return { ok: false, error: { message, offset, ...locate(text, offset) } };
}

// ---------------------------------------------------------------------------
// Encode

export type EncodeOptions = {
  /** "component": encodeURIComponent (default). "full": encodeURI, keeps :/?#&= etc. */
  scope: "component" | "full";
  /** Spaces as "+" (HTML form encoding) instead of %20. Component scope only. */
  plusForSpace: boolean;
};

/** Index of the first lone UTF-16 surrogate, or -1. Those can't be encoded. */
function loneSurrogate(text: string): number {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) i++;
      else return i;
    } else if (code >= 0xdc00 && code <= 0xdfff) return i;
  }
  return -1;
}

export function encode(text: string, options: EncodeOptions): TextResult {
  const broken = loneSurrogate(text);
  if (broken !== -1) {
    return fail(
      text,
      broken,
      "This character is half of an emoji or symbol (a lone surrogate) and can’t be encoded. Delete it and type the character again.",
    );
  }
  if (options.scope === "full") return { ok: true, output: encodeURI(text) };
  const output = encodeURIComponent(text);
  return { ok: true, output: options.plusForSpace ? output.replace(/%20/g, "+") : output };
}

// ---------------------------------------------------------------------------
// Decode

export type DecodeOptions = {
  /** "+" means space, as in HTML form data and query strings. */
  plusAsSpace: boolean;
};

const HEX = /^[0-9A-Fa-f]{2}$/;
const utf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Decodes percent-encoding as UTF-8, like decodeURIComponent, but reports
 * the position of the first malformed sequence. Text outside %XX sequences
 * is kept as is.
 */
export function decode(text: string, options: DecodeOptions): TextResult {
  // Only literal "+" become spaces; an encoded %2B stays "+".
  const plain = (segment: string) => (options.plusAsSpace ? segment.replace(/\+/g, " ") : segment);
  const parts: string[] = [];
  let i = 0;
  let plainStart = 0;
  while (i < text.length) {
    if (text[i] !== "%") {
      i++;
      continue;
    }
    parts.push(plain(text.slice(plainStart, i)));
    // A run of consecutive %XX sequences is one UTF-8 byte sequence.
    const runStart = i;
    const bytes: number[] = [];
    while (text[i] === "%") {
      const hex = text.slice(i + 1, i + 3);
      if (!HEX.test(hex)) {
        const shown = text.slice(i, i + 3).replace(/\s.*$/s, "");
        return fail(
          text,
          i,
          `“${shown}” isn’t a valid escape: “%” must be followed by two hex digits (0–9, A–F). A literal percent sign is written %25.`,
        );
      }
      bytes.push(parseInt(hex, 16));
      i += 3;
    }
    try {
      parts.push(utf8.decode(Uint8Array.from(bytes)));
    } catch {
      return fail(
        text,
        runStart,
        `“${text.slice(runStart, i)}” isn’t valid UTF-8. The text may have been encoded with another character set, or cut off in the middle of a character.`,
      );
    }
    plainStart = i;
  }
  parts.push(plain(text.slice(plainStart)));
  return { ok: true, output: parts.join("") };
}

// ---------------------------------------------------------------------------
// Parse

export type QueryParam = {
  key: string;
  value: string;
  /** True when the key appears more than once. */
  repeated: boolean;
};

export type ParsedUrl = {
  href: string;
  protocol: string;
  username: string;
  password: string;
  /** Host as the browser sends it: punycode for international names, [ ] around IPv6. */
  hostname: string;
  /** Unicode form of an international host name; null when it is the same. */
  hostnameUnicode: string | null;
  /** Explicit port, or "" when the scheme's default is used. */
  port: string;
  defaultPort: string | null;
  origin: string;
  pathname: string;
  /** The path with percent-encoding decoded, when it differs. */
  pathnameDecoded: string | null;
  search: string;
  params: QueryParam[];
  /** Fragment without "#", decoded. */
  hash: string;
};

export type ParseResult = { ok: true; url: ParsedUrl } | { ok: false; error: InputError };

const DEFAULT_PORTS: Record<string, string> = {
  "http:": "80",
  "https:": "443",
  "ws:": "80",
  "wss:": "443",
  "ftp:": "21",
};

function safeDecode(text: string): string {
  const result = decode(text, { plusAsSpace: false });
  return result.ok ? result.output : text;
}

export function parseUrl(text: string): ParseResult {
  const trimmed = text.trim();
  const start = text.indexOf(trimmed);
  if (trimmed === "") return fail(text, 0, "Enter a URL to parse.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    const looksLikeHost = /^[\w-]+(\.[\w-]+)+([/:?#]|$)/.test(trimmed);
    return fail(
      text,
      start,
      looksLikeHost
        ? `This URL has no scheme. Add one at the start, for example https://${trimmed}`
        : "This isn’t a valid URL. A URL starts with a scheme such as https://, followed by a host, for example https://example.com/path?q=1.",
    );
  }
  const counts = new Map<string, number>();
  for (const key of url.searchParams.keys()) counts.set(key, (counts.get(key) ?? 0) + 1);
  const unicodeHost = hostnameToUnicode(url.hostname);
  const decodedPath = safeDecode(url.pathname);
  return {
    ok: true,
    url: {
      href: url.href,
      protocol: url.protocol,
      username: safeDecode(url.username),
      password: safeDecode(url.password),
      hostname: url.hostname,
      hostnameUnicode: unicodeHost === url.hostname ? null : unicodeHost,
      port: url.port,
      defaultPort: DEFAULT_PORTS[url.protocol] ?? null,
      origin: url.origin === "null" ? "" : url.origin,
      pathname: url.pathname,
      pathnameDecoded: decodedPath === url.pathname ? null : decodedPath,
      search: url.search,
      params: [...url.searchParams].map(([key, value]) => ({
        key,
        value,
        repeated: (counts.get(key) ?? 0) > 1,
      })),
      hash: safeDecode(url.hash.replace(/^#/, "")),
    },
  };
}

// ---------------------------------------------------------------------------
// Punycode (RFC 3492), decode only: browsers give host names in ASCII.

const BASE = 36;
const T_MIN = 1;
const T_MAX = 26;
const SKEW = 38;
const DAMP = 700;

function adapt(delta: number, points: number, first: boolean): number {
  let d = first ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / points);
  let k = 0;
  while (d > ((BASE - T_MIN) * T_MAX) >> 1) {
    d = Math.floor(d / (BASE - T_MIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - T_MIN + 1) * d) / (d + SKEW));
}

function digitValue(code: number): number {
  if (code >= 48 && code <= 57) return code - 22; // 0-9 → 26-35
  if (code >= 65 && code <= 90) return code - 65; // A-Z
  if (code >= 97 && code <= 122) return code - 97; // a-z
  return BASE;
}

/** Decodes one punycode label (without "xn--"). Throws on invalid input. */
export function punycodeDecode(input: string): string {
  const output: number[] = [];
  const basicEnd = input.lastIndexOf("-");
  for (let j = 0; j < Math.max(basicEnd, 0); j++) output.push(input.charCodeAt(j));
  let n = 128;
  let i = 0;
  let bias = 72;
  for (let index = basicEnd > 0 ? basicEnd + 1 : 0; index < input.length;) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (index >= input.length) throw new RangeError("Invalid punycode");
      const digit = digitValue(input.charCodeAt(index++));
      if (digit >= BASE) throw new RangeError("Invalid punycode");
      i += digit * w;
      const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const length = output.length + 1;
    bias = adapt(i - oldi, length, oldi === 0);
    n += Math.floor(i / length);
    i %= length;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

/** "xn--mnchen-3ya.de" → "münchen.de". Labels that aren't valid punycode stay as they are. */
export function hostnameToUnicode(hostname: string): string {
  return hostname
    .split(".")
    .map((label) => {
      if (!/^xn--/i.test(label)) return label;
      try {
        return punycodeDecode(label.slice(4));
      } catch {
        return label;
      }
    })
    .join(".");
}
