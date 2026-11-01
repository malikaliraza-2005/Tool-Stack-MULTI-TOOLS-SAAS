// Image metadata at the container level (tool-specifications §4.4): find and
// remove EXIF, XMP, IPTC, comments and text chunks without touching the image
// data. Pure functions on bytes, shared by the image tools and jpg-to-pdf.

export type MetadataContainer = "jpeg" | "png" | "webp";

/** What a file carries besides its pixels, found by walking its segments or chunks. */
export type MetadataBlocks = {
  /** The EXIF TIFF structure ("II*\0" / "MM\0*"), without the "Exif\0\0" prefix. */
  exif?: Uint8Array;
  xmp: boolean;
  /** IPTC / Photoshop resources (JPEG APP13). */
  iptc: boolean;
  /** JPEG COM segments. */
  comments: number;
  /** Keywords of PNG text chunks (tEXt, iTXt, zTXt), e.g. "Software". */
  text: string[];
  /** PNG tIME (last-modified time). */
  time: boolean;
  /** A JFIF extension thumbnail or other camera-specific segments (JPEG APP3–APP15). */
  other: number;
};

export type StripOptions = {
  /**
   * Keep the EXIF orientation so the photo isn't shown rotated (default mode
   * of remove-exif-data). Everything else in the EXIF block is removed.
   */
  keepOrientation: boolean;
};

const EXIF_PREFIX = [0x45, 0x78, 0x69, 0x66, 0, 0]; // "Exif\0\0"
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function corrupt(): Error {
  return new Error("The file structure is damaged");
}

// ---------------------------------------------------------------------------
// TIFF (the EXIF structure)

/** EXIF orientation (1–8) from a TIFF structure; 1 when absent or unreadable. */
export function tiffOrientation(tiff: Uint8Array): number {
  if (tiff.length < 8) return 1;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const order = view.getUint16(0);
  if (order !== 0x4949 && order !== 0x4d4d) return 1;
  const little = order === 0x4949;
  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return 1;
  const entries = view.getUint16(ifd, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** A TIFF structure holding only the orientation tag (big-endian, one IFD entry). */
export function orientationOnlyTiff(orientation: number): Uint8Array {
  // prettier-ignore
  return Uint8Array.from([
    0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, // header, IFD0 at 8
    0, 1, // one entry
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, // Orientation, SHORT, 1, value
    0, 0, 0, 0, // no next IFD
  ]);
}

// ---------------------------------------------------------------------------
// JPEG

type JpegSegment = {
  marker: number;
  /** Offset of the 0xFF that starts the marker. */
  start: number;
  /** Offset after the segment (and after the scan data for SOS). */
  end: number;
  /** The segment payload, after the length field. */
  payload: Uint8Array;
};

const SOS = 0xda;
const EOI = 0xd9;
const isStandalone = (marker: number) => marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
const isApp = (marker: number) => marker >= 0xe0 && marker <= 0xef;

/** End of the entropy-coded data that follows a scan header at `from`. */
function scanEnd(bytes: Uint8Array, from: number): number {
  for (let i = from; i + 1 < bytes.length; i++) {
    if (bytes[i] !== 0xff) continue;
    const next = bytes[i + 1]!;
    // Stuffed 0xFF00, restart markers and fill bytes belong to the scan.
    if (next === 0x00 || next === 0xff || (next >= 0xd0 && next <= 0xd7)) continue;
    return i;
  }
  return bytes.length;
}

/**
 * The marker segments of a JPEG up to and including EOI. Data after EOI
 * (trailers, appended preview images) is not returned.
 */
function jpegSegments(bytes: Uint8Array): JpegSegment[] {
  if (!startsWith(bytes, [0xff, 0xd8])) throw corrupt();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const segments: JpegSegment[] = [];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw corrupt();
    let markerAt = offset + 1;
    while (bytes[markerAt] === 0xff) markerAt++; // fill bytes
    const marker = bytes[markerAt];
    if (marker === undefined) throw corrupt();
    const start = offset;
    if (marker === EOI) {
      segments.push({ marker, start, end: markerAt + 1, payload: new Uint8Array() });
      return segments;
    }
    if (isStandalone(marker)) {
      segments.push({ marker, start, end: markerAt + 1, payload: new Uint8Array() });
      offset = markerAt + 1;
      continue;
    }
    if (markerAt + 3 > bytes.length) throw corrupt();
    const length = view.getUint16(markerAt + 1);
    const payloadEnd = markerAt + 1 + length;
    if (length < 2 || payloadEnd > bytes.length) throw corrupt();
    const payload = bytes.subarray(markerAt + 3, payloadEnd);
    const end = marker === SOS ? scanEnd(bytes, payloadEnd) : payloadEnd;
    segments.push({ marker, start, end, payload });
    offset = end;
  }
  // No EOI: a truncated file. Keep what is there.
  return segments;
}

const isExifApp1 = (s: JpegSegment) => s.marker === 0xe1 && startsWith(s.payload, EXIF_PREFIX);
const XMP_NS = ascii("http://ns.adobe.com/");
const isXmpApp1 = (s: JpegSegment) => s.marker === 0xe1 && startsWith(s.payload, XMP_NS);
const JFIF = ascii("JFIF\0");
const ICC = ascii("ICC_PROFILE\0");
const ADOBE = ascii("Adobe");

/** APP segments that describe how to show the pixels (not who, where or when): kept. */
function isRenderingSegment(s: JpegSegment): boolean {
  if (s.marker === 0xe0) return startsWith(s.payload, JFIF); // JFXX thumbnails are dropped
  if (s.marker === 0xe2) return startsWith(s.payload, ICC);
  if (s.marker === 0xee) return startsWith(s.payload, ADOBE);
  return false;
}

function jpegMetadata(bytes: Uint8Array): MetadataBlocks {
  const blocks: MetadataBlocks = emptyBlocks();
  for (const segment of jpegSegments(bytes)) {
    if (isExifApp1(segment)) blocks.exif ??= segment.payload.subarray(EXIF_PREFIX.length);
    else if (isXmpApp1(segment)) blocks.xmp = true;
    else if (segment.marker === 0xed) blocks.iptc = true;
    else if (segment.marker === 0xfe) blocks.comments++;
    else if (isApp(segment.marker) && !isRenderingSegment(segment)) blocks.other++;
  }
  return blocks;
}

function jpegSegment(marker: number, payload: Uint8Array): Uint8Array {
  const length = payload.length + 2;
  return concat([Uint8Array.from([0xff, marker, length >> 8, length & 0xff]), payload]);
}

function stripJpeg(bytes: Uint8Array, options: StripOptions): Uint8Array {
  const segments = jpegSegments(bytes);
  const exif = segments.find(isExifApp1);
  const orientation = exif ? tiffOrientation(exif.payload.subarray(EXIF_PREFIX.length)) : 1;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let orientationWritten = !options.keepOrientation || orientation === 1;
  for (const segment of segments) {
    const isMetadata =
      segment.marker === 0xfe || (isApp(segment.marker) && !isRenderingSegment(segment));
    // The orientation goes right after JFIF (if any), before the first non-APP0 segment.
    if (!orientationWritten && segment.marker !== 0xe0) {
      parts.push(
        jpegSegment(0xe1, concat([Uint8Array.from(EXIF_PREFIX), orientationOnlyTiff(orientation)])),
      );
      orientationWritten = true;
    }
    if (!isMetadata) parts.push(bytes.subarray(segment.start, segment.end));
  }
  return concat(parts);
}

/** Sets the orientation tag of a TIFF structure in place, if it has one. */
function setTiffOrientation(tiff: Uint8Array, orientation: number): void {
  if (tiff.length < 8) return;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const little = view.getUint16(0) === 0x4949;
  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return;
  const entries = view.getUint16(ifd, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) return;
    if (view.getUint16(entry, little) === 0x0112) view.setUint16(entry + 8, orientation, little);
  }
}

/**
 * Copies the metadata segments of `source` into `target` (a re-encoded copy
 * of the same photo), after its JFIF segment. The orientation is set to 1:
 * the re-encoded pixels are already upright.
 */
export function copyJpegMetadata(source: Uint8Array, target: Uint8Array): Uint8Array {
  const metadata = jpegSegments(source)
    .filter((s) => s.marker === 0xfe || (isApp(s.marker) && !isRenderingSegment(s)))
    .map((s) => {
      const copy = source.slice(s.start, s.end);
      if (isExifApp1(s)) setTiffOrientation(copy.subarray(4 + EXIF_PREFIX.length), 1);
      return copy;
    });
  if (metadata.length === 0) return target;
  const segments = jpegSegments(target);
  const first = segments.find((s) => s.marker !== 0xe0);
  const at = first?.start ?? 2;
  return concat([target.subarray(0, at), ...metadata, target.subarray(at)]);
}

/** The scan data of a JPEG (first SOS to EOI): what must stay byte-identical. */
export function jpegScanData(bytes: Uint8Array): Uint8Array {
  const segments = jpegSegments(bytes);
  const first = segments.find((s) => s.marker === SOS);
  const last = segments.at(-1);
  if (!first || !last) throw corrupt();
  return bytes.subarray(first.start, last.end);
}

/** EXIF orientation (1–8) of a JPEG, read from its header; 1 when absent. */
export function jpegOrientation(bytes: Uint8Array): number {
  try {
    const exif = jpegSegments(bytes).find(isExifApp1);
    return exif ? tiffOrientation(exif.payload.subarray(EXIF_PREFIX.length)) : 1;
  } catch {
    return 1;
  }
}

// ---------------------------------------------------------------------------
// PNG

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_TEXT = new Set(["tEXt", "iTXt", "zTXt"]);

type PngChunk = { type: string; start: number; end: number; data: Uint8Array };

function pngChunks(bytes: Uint8Array): PngChunk[] {
  if (!startsWith(bytes, PNG_SIGNATURE)) throw corrupt();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw corrupt();
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    chunks.push({
      type,
      start: offset,
      end,
      data: bytes.subarray(offset + 8, offset + 8 + length),
    });
    offset = end;
    if (type === "IEND") break;
  }
  if (chunks[0]?.type !== "IHDR") throw corrupt();
  return chunks;
}

/** The keyword of a text chunk: the bytes before the first NUL (Latin-1). */
function textKeyword(data: Uint8Array): string {
  const nul = data.indexOf(0);
  return String.fromCharCode(...data.subarray(0, nul === -1 ? Math.min(data.length, 79) : nul));
}

function pngMetadata(bytes: Uint8Array): MetadataBlocks {
  const blocks = emptyBlocks();
  for (const chunk of pngChunks(bytes)) {
    if (chunk.type === "eXIf") blocks.exif ??= chunk.data;
    else if (chunk.type === "tIME") blocks.time = true;
    else if (PNG_TEXT.has(chunk.type)) {
      const keyword = textKeyword(chunk.data);
      if (keyword === "XML:com.adobe.xmp") blocks.xmp = true;
      else blocks.text.push(keyword);
    }
  }
  return blocks;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(ascii(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function stripPng(bytes: Uint8Array, options: StripOptions): Uint8Array {
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  for (const chunk of pngChunks(bytes)) {
    if (chunk.type === "eXIf") {
      const orientation = tiffOrientation(chunk.data);
      if (options.keepOrientation && orientation !== 1) {
        parts.push(pngChunk("eXIf", orientationOnlyTiff(orientation)));
      }
      continue;
    }
    if (chunk.type === "tIME" || PNG_TEXT.has(chunk.type)) continue;
    parts.push(bytes.subarray(chunk.start, chunk.end));
  }
  return concat(parts);
}

// ---------------------------------------------------------------------------
// WebP (RIFF)

type RiffChunk = { fourcc: string; start: number; end: number; data: Uint8Array };

function webpChunks(bytes: Uint8Array): RiffChunk[] {
  if (!startsWith(bytes, ascii("RIFF")) || !startsWith(bytes, ascii("WEBP"), 8)) throw corrupt();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riffEnd = Math.min(bytes.length, 8 + view.getUint32(4, true));
  const chunks: RiffChunk[] = [];
  let offset = 12;
  while (offset + 8 <= riffEnd) {
    const size = view.getUint32(offset + 4, true);
    const dataEnd = offset + 8 + size;
    if (dataEnd > riffEnd) throw corrupt();
    const end = Math.min(dataEnd + (size & 1), riffEnd); // chunks are padded to even sizes
    const fourcc = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    chunks.push({ fourcc, start: offset, end, data: bytes.subarray(offset + 8, dataEnd) });
    offset = end;
  }
  if (chunks.length === 0) throw corrupt();
  return chunks;
}

/** WebP EXIF chunks are TIFF, though some writers keep the JPEG "Exif\0\0" prefix. */
function webpTiff(data: Uint8Array): Uint8Array {
  return startsWith(data, EXIF_PREFIX) ? data.subarray(EXIF_PREFIX.length) : data;
}

function webpMetadata(bytes: Uint8Array): MetadataBlocks {
  const blocks = emptyBlocks();
  for (const chunk of webpChunks(bytes)) {
    if (chunk.fourcc === "EXIF") blocks.exif ??= webpTiff(chunk.data);
    else if (chunk.fourcc === "XMP ") blocks.xmp = true;
  }
  return blocks;
}

const VP8X_XMP = 0x04;
const VP8X_EXIF = 0x08;

function riffChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + (data.length & 1));
  out.set(ascii(fourcc), 0);
  new DataView(out.buffer).setUint32(4, data.length, true);
  out.set(data, 8);
  return out;
}

function stripWebp(bytes: Uint8Array, options: StripOptions): Uint8Array {
  const chunks = webpChunks(bytes);
  const exif = chunks.find((chunk) => chunk.fourcc === "EXIF");
  const orientation = exif ? tiffOrientation(webpTiff(exif.data)) : 1;
  const keepExif = options.keepOrientation && orientation !== 1;
  const parts: Uint8Array[] = [];
  for (const chunk of chunks) {
    if (chunk.fourcc === "XMP ") continue;
    if (chunk.fourcc === "EXIF") {
      if (keepExif) parts.push(riffChunk("EXIF", orientationOnlyTiff(orientation)));
      continue;
    }
    if (chunk.fourcc === "VP8X") {
      // The extended header flags which metadata chunks follow.
      const copy = bytes.slice(chunk.start, chunk.end);
      copy[8] = copy[8]! & ~VP8X_XMP & (keepExif ? 0xff : ~VP8X_EXIF);
      parts.push(copy);
      continue;
    }
    parts.push(bytes.subarray(chunk.start, chunk.end));
  }
  const body = concat(parts);
  const header = new Uint8Array(12);
  header.set(ascii("RIFF"), 0);
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  header.set(ascii("WEBP"), 8);
  return concat([header, body]);
}

// ---------------------------------------------------------------------------

function emptyBlocks(): MetadataBlocks {
  return { xmp: false, iptc: false, comments: 0, text: [], time: false, other: 0 };
}

/** Lists the metadata a file carries. Throws when the container is damaged. */
export function findMetadata(bytes: Uint8Array, kind: MetadataContainer): MetadataBlocks {
  if (kind === "jpeg") return jpegMetadata(bytes);
  if (kind === "png") return pngMetadata(bytes);
  return webpMetadata(bytes);
}

/** True when `findMetadata` found anything to remove. */
export function hasMetadata(blocks: MetadataBlocks): boolean {
  return (
    blocks.exif !== undefined ||
    blocks.xmp ||
    blocks.iptc ||
    blocks.comments > 0 ||
    blocks.text.length > 0 ||
    blocks.time ||
    blocks.other > 0
  );
}

/**
 * Removes metadata losslessly: the image data is copied byte for byte.
 * JPEG: EXIF, XMP, IPTC, comments, thumbnails and camera segments (JFIF, ICC
 * profile and Adobe colour segments stay). PNG: eXIf, text chunks and tIME.
 * WebP: EXIF and XMP chunks. Throws when the container is damaged.
 */
export function stripMetadata(
  bytes: Uint8Array,
  kind: MetadataContainer,
  options: StripOptions,
): Uint8Array {
  if (kind === "jpeg") return stripJpeg(bytes, options);
  if (kind === "png") return stripPng(bytes, options);
  return stripWebp(bytes, options);
}

/** EXIF orientation of any supported container; 1 when absent. */
export function readOrientation(bytes: Uint8Array, kind: MetadataContainer): number {
  try {
    const { exif } = findMetadata(bytes, kind);
    return exif ? tiffOrientation(exif) : 1;
  } catch {
    return 1;
  }
}
