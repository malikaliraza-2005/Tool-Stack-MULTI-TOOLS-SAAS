// Image formats and what the image tools need to know about a file before
// decoding it (tool-specifications §4): size, orientation, alpha, animation.
// Pure functions on bytes; safe to import from UI code.

import { detectFileType, type FileKind } from "@/lib/files/sniff";
import { readOrientation } from "./metadata";

/** Formats the image tools can write. */
export type OutputFormat = "jpeg" | "png" | "webp" | "avif";

export type ImageKind = Exclude<FileKind, "pdf">;

export const OUTPUT_FORMATS: Record<
  OutputFormat,
  { label: string; extension: string; mime: string; lossy: boolean; alpha: boolean }
> = {
  jpeg: { label: "JPG", extension: "jpg", mime: "image/jpeg", lossy: true, alpha: false },
  png: { label: "PNG", extension: "png", mime: "image/png", lossy: false, alpha: true },
  webp: { label: "WebP", extension: "webp", mime: "image/webp", lossy: true, alpha: true },
  avif: { label: "AVIF", extension: "avif", mime: "image/avif", lossy: true, alpha: true },
};

export const KIND_LABELS: Record<ImageKind, string> = {
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
  gif: "GIF",
  bmp: "BMP",
  avif: "AVIF",
  heic: "HEIC",
};

export const KIND_MIME: Record<ImageKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  avif: "image/avif",
  heic: "image/heic",
};

/** The output format of the same type as the input, when there is one. */
export function sameFormat(kind: ImageKind): OutputFormat | null {
  return kind === "jpeg" || kind === "png" || kind === "webp" || kind === "avif" ? kind : null;
}

export type ImageInfo = {
  kind: ImageKind;
  /** Upright size: EXIF orientations 5–8 swap width and height. */
  width: number;
  height: number;
  /** EXIF orientation 1–8 (JPEG, PNG, WebP); 1 otherwise. */
  orientation: number;
  /** Whether the file can hold transparency (from its header; it may still be fully opaque). */
  alpha: boolean;
  /** More than one frame (GIF, animated WebP or PNG): only the first is used. */
  animated: boolean;
};

const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

function indexOf(bytes: Uint8Array, needle: readonly number[], from = 0, to = bytes.length) {
  const last = Math.min(to, bytes.length) - needle.length;
  outer: for (let i = from; i <= last; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

function jpegInfo(bytes: Uint8Array, view: DataView) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    // Start of frame (baseline, progressive, …): not DHT (C4), JPG (C8) or DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
    }
    if (marker === 0xda || marker === 0xd9) return null;
    offset += 2 + view.getUint16(offset + 2);
  }
  return null;
}

function pngInfo(bytes: Uint8Array, view: DataView) {
  if (bytes.length < 33) return null;
  const colorType = bytes[25]!;
  // tRNS and acTL come before the image data, so only the header area is searched.
  const idat = indexOf(bytes, ascii("IDAT"));
  const head = idat === -1 ? bytes.length : idat;
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    alpha: colorType === 4 || colorType === 6 || indexOf(bytes, ascii("tRNS"), 33, head) !== -1,
    animated: indexOf(bytes, ascii("acTL"), 33, head) !== -1,
  };
}

function webpInfo(bytes: Uint8Array, view: DataView) {
  if (bytes.length < 30) return null;
  const fourcc = String.fromCharCode(...bytes.subarray(12, 16));
  const data = 20;
  if (fourcc === "VP8X") {
    const flags = bytes[data]!;
    const u24 = (at: number) => bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
    return {
      width: u24(data + 4) + 1,
      height: u24(data + 7) + 1,
      alpha: (flags & 0x10) !== 0,
      animated: (flags & 0x02) !== 0,
    };
  }
  if (fourcc === "VP8L") {
    if (bytes[data] !== 0x2f) return null;
    const bits = view.getUint32(data + 1, true);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
      alpha: ((bits >>> 28) & 1) === 1,
      animated: false,
    };
  }
  if (fourcc === "VP8 ") {
    if (bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) {
      return null;
    }
    return {
      width: view.getUint16(data + 6, true) & 0x3fff,
      height: view.getUint16(data + 8, true) & 0x3fff,
      alpha: false,
      animated: false,
    };
  }
  return null;
}

/** Walks a GIF's blocks: frame count and whether any frame uses transparency. */
function gifInfo(bytes: Uint8Array, view: DataView) {
  if (bytes.length < 13) return null;
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  let offset = 13;
  if (bytes[10]! & 0x80) offset += 3 * 2 ** ((bytes[10]! & 0x07) + 1);
  let frames = 0;
  let alpha = false;
  const skipSubBlocks = (at: number) => {
    while (at < bytes.length && bytes[at] !== 0) at += bytes[at]! + 1;
    return at + 1;
  };
  while (offset < bytes.length) {
    const block = bytes[offset];
    if (block === 0x3b) break; // trailer
    if (block === 0x21) {
      if (bytes[offset + 1] === 0xf9 && (bytes[offset + 3]! & 1) === 1) alpha = true;
      offset = skipSubBlocks(offset + 2);
    } else if (block === 0x2c) {
      frames++;
      if (frames > 1) break;
      const packed = bytes[offset + 9] ?? 0;
      offset += 10;
      if (packed & 0x80) offset += 3 * 2 ** ((packed & 0x07) + 1);
      offset = skipSubBlocks(offset + 1); // LZW minimum code size, then data
    } else {
      break;
    }
  }
  return { width, height, alpha, animated: frames > 1 };
}

function bmpInfo(bytes: Uint8Array, view: DataView) {
  if (bytes.length < 30) return null;
  return {
    width: Math.abs(view.getInt32(18, true)),
    height: Math.abs(view.getInt32(22, true)),
    alpha: view.getUint16(28, true) === 32,
    animated: false,
  };
}

/** AVIF and HEIC (ISO-BMFF): the largest `ispe` (image spatial extent) box is the full image. */
function heifInfo(bytes: Uint8Array, view: DataView) {
  const ispe = ascii("ispe");
  let best: { width: number; height: number } | null = null;
  const end = Math.min(bytes.length, 1 << 20);
  for (let at = indexOf(bytes, ispe, 0, end); at !== -1; at = indexOf(bytes, ispe, at + 4, end)) {
    if (at + 16 > bytes.length) break;
    const width = view.getUint32(at + 8);
    const height = view.getUint32(at + 12);
    if (!best || width * height > best.width * best.height) best = { width, height };
  }
  if (!best) return null;
  // An auxiliary alpha image is declared with this URN.
  const alpha = indexOf(bytes, ascii("auxC"), 0, end) !== -1;
  // `irot` angles 1 and 3 (90°, 270°) swap the sides.
  const irot = indexOf(bytes, ascii("irot"), 0, end);
  const angle = irot !== -1 ? (bytes[irot + 4] ?? 0) & 3 : 0;
  const swap = angle === 1 || angle === 3;
  return {
    width: swap ? best.height : best.width,
    height: swap ? best.width : best.height,
    alpha,
    animated: false,
  };
}

/**
 * Reads an image's header without decoding it. Returns null when the type is
 * unknown or the header is damaged.
 */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  const kind = detectFileType(bytes.subarray(0, 1024));
  if (!kind || kind === "pdf") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let found: { width: number; height: number; alpha?: boolean; animated?: boolean } | null;
  try {
    if (kind === "jpeg") found = jpegInfo(bytes, view);
    else if (kind === "png") found = pngInfo(bytes, view);
    else if (kind === "webp") found = webpInfo(bytes, view);
    else if (kind === "gif") found = gifInfo(bytes, view);
    else if (kind === "bmp") found = bmpInfo(bytes, view);
    else found = heifInfo(bytes, view);
  } catch {
    return null; // a header that ends early
  }
  if (!found || found.width < 1 || found.height < 1) return null;
  const orientation =
    kind === "jpeg" || kind === "png" || kind === "webp" ? readOrientation(bytes, kind) : 1;
  const swap = orientation >= 5;
  return {
    kind,
    width: swap ? found.height : found.width,
    height: swap ? found.width : found.height,
    orientation,
    alpha: found.alpha ?? false,
    animated: found.animated ?? false,
  };
}

/** "4032 × 3024 · 12.2 MP" style megapixels, one decimal. */
export function megapixels(width: number, height: number): string {
  return `${(Math.round((width * height) / 100_000) / 10).toLocaleString("en-US")} MP`;
}
