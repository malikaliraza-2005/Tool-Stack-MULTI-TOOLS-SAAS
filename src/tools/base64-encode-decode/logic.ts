// Base64 encoding and decoding (tool-specifications §5.3). Pure functions: no
// DOM, no React. Runs on the main thread for small text and in the worker
// for files and large input.

import { detectFileType, type FileKind } from "@/lib/files/sniff";

export type EncodeOptions = {
  /** RFC 4648 §5 alphabet ("-" and "_"), without "=" padding. */
  urlSafe: boolean;
  /** Line break every 76 characters (MIME, RFC 2045). */
  wrap: boolean;
};

export const WRAP_COLUMN = 76;

// A multiple of 3, so encoded chunks join without padding in between, and
// well under engines' limits on spread arguments (fromCharCode below).
const ENCODE_CHUNK = 3 * 8 * 1024;

/** Base64 of `bytes`. */
export function encodeBytes(bytes: Uint8Array, options: EncodeOptions): string {
  const parts: string[] = [];
  for (let start = 0; start < bytes.length; start += ENCODE_CHUNK) {
    const chunk = bytes.subarray(start, start + ENCODE_CHUNK);
    parts.push(btoa(String.fromCharCode(...chunk)));
  }
  let output = parts.join("");
  if (options.urlSafe) output = output.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return options.wrap ? wrapLines(output, WRAP_COLUMN) : output;
}

/** Base64 of the UTF-8 bytes of `text`. */
export function encodeText(text: string, options: EncodeOptions): string {
  return encodeBytes(new TextEncoder().encode(text), options);
}

function wrapLines(text: string, column: number): string {
  const lines: string[] = [];
  for (let start = 0; start < text.length; start += column) {
    lines.push(text.slice(start, start + column));
  }
  return lines.join("\n");
}

/** `data:<mime>;base64,<data>`. Data URLs always use the standard alphabet on one line. */
export function toDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${encodeBytes(bytes, { urlSafe: false, wrap: false })}`;
}

// ---------------------------------------------------------------------------
// Decoding

/** Where in the input a problem is (1-based line and column). */
export type InputError = { message: string; line: number; column: number; offset: number };

export type DecodeResult =
  { ok: true; bytes: Uint8Array; dataUrlMime: string | null } | { ok: false; error: InputError };

// Character code → 6-bit value; both alphabets are accepted. -1: invalid.
const VALUES = new Int8Array(128).fill(-1);
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("").forEach((c, i) => {
  VALUES[c.charCodeAt(0)] = i;
});
VALUES["+".charCodeAt(0)] = 62;
VALUES["-".charCodeAt(0)] = 62;
VALUES["/".charCodeAt(0)] = 63;
VALUES["_".charCodeAt(0)] = 63;

const isSpace = (code: number) => code === 32 || code === 9 || code === 10 || code === 13;

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

function inputError(text: string, offset: number, message: string): DecodeResult {
  return { ok: false, error: { message, offset, ...locate(text, offset) } };
}

/** Code point at `offset`. */
function charAt(text: string, offset: number): string {
  return String.fromCodePoint(text.codePointAt(offset) ?? 0);
}

// Characters that are hard to read inside quotation marks.
const CHAR_NAMES: Record<string, string> = {
  '"': 'A double quote (")',
  "'": "A single quote (')",
  "\u00a0": "A non-breaking space",
};

/** "“é”", or a name for quotes and invisible characters. */
function describeChar(char: string): string {
  return CHAR_NAMES[char] ?? `“${char}”`;
}

/**
 * Decodes Base64 (standard or URL-safe alphabet; whitespace and line breaks
 * ignored; padding optional) or a data URL. Errors carry the position of the
 * first problem.
 */
export function decode(text: string): DecodeResult {
  const start = text.search(/\S/);
  if (start !== -1 && /^data:/i.test(text.slice(start, start + 5)))
    return decodeDataUrl(text, start);
  return decodeBase64(text, 0, text.length);
}

function decodeBase64(text: string, from: number, to: number): DecodeResult {
  const output = new Uint8Array(Math.ceil(((to - from) * 3) / 4));
  let length = 0;
  let buffer = 0;
  let bits = 0;
  let count = 0;
  let padding = 0;
  let firstPad = -1;

  for (let i = from; i < to; i++) {
    const code = text.charCodeAt(i);
    if (isSpace(code)) continue;
    if (code === 61 /* = */) {
      if (firstPad === -1) firstPad = i;
      padding++;
      continue;
    }
    const value = code < 128 ? VALUES[code]! : -1;
    if (value === -1) {
      const char = charAt(text, i);
      const hint = char === "%" ? " It looks URL-encoded: decode it as a URL first." : "";
      return inputError(
        text,
        i,
        `${describeChar(char)} isn’t a Base64 character. Base64 uses A–Z, a–z, 0–9, “+” and “/” (or “-” and “_”), with “=” at the end.${hint}`,
      );
    }
    if (firstPad !== -1) {
      return inputError(text, firstPad, "“=” padding can only appear at the end.");
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    count++;
    if (bits >= 8) {
      bits -= 8;
      output[length++] = (buffer >> bits) & 0xff;
    }
  }

  const end = lastNonSpace(text, from, to);
  if (count % 4 === 1) {
    return inputError(
      text,
      end,
      `The Base64 text has ${count.toLocaleString("en-US")} characters, which can’t be complete (one character too many or several missing). Check that it was copied in full.`,
    );
  }
  if (padding > 0 && ((count + padding) % 4 !== 0 || padding > 2)) {
    return inputError(
      text,
      firstPad,
      `Wrong padding: ${padding} “=” after ${count.toLocaleString("en-US")} characters. Remove the “=” characters or fix the length.`,
    );
  }
  return { ok: true, bytes: output.slice(0, length), dataUrlMime: null };
}

function lastNonSpace(text: string, from: number, to: number): number {
  for (let i = to - 1; i >= from; i--) if (!isSpace(text.charCodeAt(i))) return i;
  return from;
}

/** `data:[<mime>][;param=value]*[;base64],<data>` (RFC 2397). */
function decodeDataUrl(text: string, start: number): DecodeResult {
  const comma = text.indexOf(",", start);
  if (comma === -1) {
    return inputError(
      text,
      start,
      "This data URL has no “,” before its data. A data URL looks like data:image/png;base64,iVBOR…",
    );
  }
  const params = text.slice(start + 5, comma).split(";");
  const isBase64 = params[params.length - 1]?.trim().toLowerCase() === "base64";
  const mime = params[0]?.trim().toLowerCase() || "text/plain";
  const end = lastNonSpace(text, comma + 1, text.length) + 1;

  if (isBase64) {
    const result = decodeBase64(text, comma + 1, end);
    return result.ok ? { ...result, dataUrlMime: mime } : result;
  }
  // Not Base64: the data is percent-encoded bytes.
  const data = text.slice(comma + 1, end);
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  for (let i = 0; i < data.length; i++) {
    if (data[i] === "%") {
      const hex = data.slice(i + 1, i + 3);
      if (!/^[0-9a-f]{2}$/i.test(hex)) {
        return inputError(text, comma + 1 + i, "“%” must be followed by two hex digits.");
      }
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      const char = charAt(data, i);
      bytes.push(...encoder.encode(char));
      i += char.length - 1;
    }
  }
  return { ok: true, bytes: Uint8Array.from(bytes), dataUrlMime: mime };
}

// ---------------------------------------------------------------------------
// What the decoded bytes are

type Kind = FileKind | "zip" | "gzip";

const KINDS: Record<Kind, { mime: string; ext: string; label: string }> = {
  pdf: { mime: "application/pdf", ext: "pdf", label: "a PDF document" },
  jpeg: { mime: "image/jpeg", ext: "jpg", label: "a JPEG image" },
  png: { mime: "image/png", ext: "png", label: "a PNG image" },
  webp: { mime: "image/webp", ext: "webp", label: "a WebP image" },
  gif: { mime: "image/gif", ext: "gif", label: "a GIF image" },
  avif: { mime: "image/avif", ext: "avif", label: "an AVIF image" },
  heic: { mime: "image/heic", ext: "heic", label: "a HEIC image" },
  bmp: { mime: "image/bmp", ext: "bmp", label: "a BMP image" },
  zip: { mime: "application/zip", ext: "zip", label: "a ZIP archive" },
  gzip: { mime: "application/gzip", ext: "gz", label: "a gzip file" },
};

/** File extensions for common data-URL MIME types not detected by magic bytes. */
const MIME_EXTENSIONS: Record<string, string> = {
  "application/json": "json",
  "application/octet-stream": "bin",
  "application/xml": "xml",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "text/css": "css",
  "text/csv": "csv",
  "text/html": "html",
  "text/javascript": "js",
  "text/plain": "txt",
  "text/xml": "xml",
  "font/woff2": "woff2",
  "font/woff": "woff",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
};

export type DecodedType = {
  mime: string;
  ext: string;
  /** "a PNG image"; null when unknown. */
  label: string | null;
};

/** The type of decoded bytes: magic bytes first, then the data-URL MIME. */
export function decodedType(bytes: Uint8Array, dataUrlMime: string | null): DecodedType {
  const kind: Kind | null =
    detectFileType(bytes) ??
    (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
      ? "zip"
      : bytes[0] === 0x1f && bytes[1] === 0x8b
        ? "gzip"
        : null);
  if (kind) return { ...KINDS[kind] };
  if (dataUrlMime && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(dataUrlMime)) {
    return { mime: dataUrlMime, ext: MIME_EXTENSIONS[dataUrlMime] ?? "bin", label: null };
  }
  return { mime: "application/octet-stream", ext: "bin", label: null };
}

/**
 * The decoded bytes as text, or null when they aren't text: invalid UTF-8,
 * NUL bytes, or a known binary file type.
 */
export function bytesAsText(bytes: Uint8Array, type: DecodedType): string | null {
  if (type.label) return null;
  if (bytes.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** MIME type for a file being encoded: magic bytes, then the browser's type. */
export function mimeForFile(bytes: Uint8Array, browserType: string): string {
  const type = decodedType(bytes, browserType.toLowerCase() || null);
  return type.mime;
}

// ---------------------------------------------------------------------------
// Jobs (main thread or worker)

export type Base64Job =
  | { op: "encode-text"; text: string; options: EncodeOptions }
  | {
      op: "encode-file";
      bytes: ArrayBuffer;
      browserType: string;
      options: EncodeOptions & { dataUrl: boolean };
    }
  | { op: "decode"; text: string };

export type Base64JobResult =
  | { op: "encode"; output: string }
  | {
      op: "decode";
      ok: true;
      bytes: ArrayBuffer;
      size: number;
      type: DecodedType;
      text: string | null;
    }
  | { op: "decode"; ok: false; error: InputError };

export function runJob(job: Base64Job): Base64JobResult {
  switch (job.op) {
    case "encode-text":
      return { op: "encode", output: encodeText(job.text, job.options) };
    case "encode-file": {
      const bytes = new Uint8Array(job.bytes);
      const output = job.options.dataUrl
        ? toDataUrl(bytes, mimeForFile(bytes, job.browserType))
        : encodeBytes(bytes, job.options);
      return { op: "encode", output };
    }
    case "decode": {
      const result = decode(job.text);
      if (!result.ok) return { op: "decode", ok: false, error: result.error };
      const type = decodedType(result.bytes, result.dataUrlMime);
      return {
        op: "decode",
        ok: true,
        bytes: result.bytes.buffer as ArrayBuffer,
        size: result.bytes.length,
        type,
        text: bytesAsText(result.bytes, type),
      };
    }
  }
}
