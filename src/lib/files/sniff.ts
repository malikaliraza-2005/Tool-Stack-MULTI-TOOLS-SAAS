// File type detection by magic bytes, never by extension alone
// (tool-specifications §2.1, architecture §11.2).

export type FileKind = "pdf" | "jpeg" | "png" | "webp" | "gif" | "avif" | "heic" | "bmp";

/** Bytes read from the start of a file to sniff it. A PDF may have up to 1 KB before `%PDF-`. */
export const SNIFF_BYTES = 1024;

const KIND_LABELS: Record<FileKind, string> = {
  pdf: "a PDF document",
  jpeg: "a JPEG image",
  png: "a PNG image",
  webp: "a WebP image",
  gif: "a GIF image",
  avif: "an AVIF image",
  heic: "a HEIC image",
  bmp: "a BMP image",
};

/** "a JPEG image", for messages like "photo.pdf is a JPEG image." */
export function describeKind(kind: FileKind): string {
  return KIND_LABELS[kind];
}

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));
const PDF = ascii("%PDF-");

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  const last = Math.min(bytes.length, SNIFF_BYTES) - PDF.length;
  for (let i = 0; i <= last; i++) {
    if (startsWith(bytes, PDF, i)) return true;
  }
  return false;
}

/** Brands of an ISO-BMFF `ftyp` box: major brand at 8, compatible brands from 16. */
function ftypBrands(bytes: Uint8Array): string[] {
  if (bytes.length < 16 || !startsWith(bytes, ascii("ftyp"), 4)) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxEnd = Math.min(view.getUint32(0), bytes.length);
  const brand = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  const brands = [brand(8)];
  for (let at = 16; at + 4 <= boxEnd; at += 4) brands.push(brand(at));
  return brands;
}

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

/** Detects a file's type from its first bytes. Returns null for anything unknown. */
export function detectFileType(bytes: Uint8Array): FileKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "webp";
  if (startsWith(bytes, ascii("GIF8"))) return "gif";
  if (startsWith(bytes, ascii("BM")) && bytes.length >= 14) return "bmp";
  const brands = ftypBrands(bytes);
  // AVIF files often also list `mif1`, so AVIF is checked first.
  if (brands.some((b) => b === "avif" || b === "avis")) return "avif";
  if (brands.some((b) => HEIC_BRANDS.has(b))) return "heic";
  if (hasPdfHeader(bytes)) return "pdf";
  return null;
}

/** Reads only the first bytes of a file and detects its type. */
export async function sniffFile(file: Blob): Promise<FileKind | null> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  return detectFileType(head);
}
