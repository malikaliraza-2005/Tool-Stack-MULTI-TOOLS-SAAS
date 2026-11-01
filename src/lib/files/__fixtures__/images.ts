// Image fixtures generated in code (no binaries committed), shared by unit and
// E2E tests of the image-input tools (P5-T03, P6-T04).

import { zlibSync } from "fflate";

/**
 * A 40 × 20 JPEG: red left half, blue right half (encoded by Chromium). With
 * EXIF orientation added, the halves show which way it was turned.
 */
export const RED_BLUE_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAAUACgDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAcI/8QAGBABAAMBAAAAAAAAAAAAAAAAAAhFhMP/xAAWAQEBAQAAAAAAAAAAAAAAAAAICQr/xAAaEQABBQEAAAAAAAAAAAAAAAAABAUIOIS0/9oADAMBAAIRAxEAPwDF4Apl/CQyqodXFIVelVQ6uKQr/QlrEwau1SRDl9Yl7zcicAFUGs14AyrmlAkMqqHVxSEF/oS1iYNXapIhy+sS95uROACqDWf/2Q==";

export function redBlueJpeg(): Uint8Array {
  return Uint8Array.from(atob(RED_BLUE_JPEG_BASE64), (c) => c.charCodeAt(0));
}

/** Inserts an EXIF APP1 segment with `orientation` (1–8) right after the JPEG's SOI marker. */
export function withExifOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  // Big-endian TIFF header, one IFD entry: 0x0112 (Orientation), SHORT, count 1.
  const tiff = [
    0x4d,
    0x4d,
    0x00,
    0x2a,
    0,
    0,
    0,
    0x08,
    0x00,
    0x01,
    0x01,
    0x12,
    0x00,
    0x03,
    0,
    0,
    0,
    1,
    0,
    orientation,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const length = payload.length + 2;
  const segment = [0xff, 0xe1, length >> 8, length & 0xff, ...payload];
  return Uint8Array.from([...jpeg.subarray(0, 2), ...segment, ...jpeg.subarray(2)]);
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

function chunk(type: string, data: Uint8Array): number[] {
  const body = Uint8Array.from([...type].map((c) => c.charCodeAt(0)).concat([...data]));
  const length = data.length;
  const crc = crc32(body);
  return [
    length >>> 24,
    (length >>> 16) & 255,
    (length >>> 8) & 255,
    length & 255,
    ...body,
    crc >>> 24,
    (crc >>> 16) & 255,
    (crc >>> 8) & 255,
    crc & 255,
  ];
}

/** An RGBA PNG of `width` × `height`; `pixel(x, y)` returns [r, g, b, a]. */
export function makePng(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number],
): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (1 + width * 4) + 1 + x * 4);
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk("IHDR", header),
    ...chunk("IDAT", zlibSync(raw)),
    ...chunk("IEND", new Uint8Array()),
  ]);
}

/** A 16 × 16 PNG, opaque green on the left, fully transparent on the right. */
export const halfTransparentPng = () =>
  makePng(16, 16, (x) => (x < 8 ? [0, 160, 0, 255] : [0, 0, 0, 0]));

// ---------------------------------------------------------------------------
// Phase 6 fixtures (P6-T04): metadata, WebP, AVIF and animated GIF.

const bytesOf = (text: string) => Array.from(text, (c) => c.charCodeAt(0));
const fromBase64 = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/** A 16 × 8 lossy WebP (simple VP8 format): red left half, blue right half (libwebp via jSquash). */
export const tinyWebp = () =>
  fromBase64(
    "UklGRkQAAABXRUJQVlA4IDgAAAAwAgCdASoQAAgAAMASJaACdLoB+AH4gARoAAD+/Suf/9+gm/93m/10S8z/60c//rRlcH9aOb+gAA==",
  );

/** A 16 × 8 AVIF: red left half, blue right half (libavif via jSquash). */
export const tinyAvif = () =>
  fromBase64(
    "AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAACsAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAABAAAAAIAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAADNtZGF0EgAKCBgMv7BAgIGhMh0TQAIIIIQAtxTbtqwq5eaAXBWMOjMJm8e95BlXQA==",
  );

/** A 1 × 1 GIF with `frames` frames (black, then white), looping (NETSCAPE2.0) when animated. */
export function gif(frames = 2): Uint8Array {
  const frame = (color: number) => [
    ...[0x21, 0xf9, 4, 0, 10, 0, 0, 0], // graphic control: 0.1 s delay
    ...[0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0], // image descriptor 1 × 1
    ...[2, 2, color === 0 ? 0x44 : 0x4c, 1, 0], // LZW data (one pixel of `color`)
  ];
  return Uint8Array.from([
    ...bytesOf("GIF89a"),
    ...[1, 0, 1, 0, 0x80, 0, 0], // 1 × 1, global colour table of 2
    ...[0, 0, 0, 255, 255, 255],
    ...(frames > 1 ? [0x21, 0xff, 11, ...bytesOf("NETSCAPE2.0"), 3, 1, 0, 0, 0] : []),
    ...Array.from({ length: frames }, (_, i) => frame(i % 2)).flat(),
    0x3b,
  ]);
}

export type TiffValue = { tag: number } & (
  { ascii: string } | { short: number } | { rationals: [number, number][] } | { ifd: TiffValue[] }
);

/**
 * A big-endian TIFF structure (the EXIF block). Sub-IFDs (`ifd`) are written
 * as LONG offsets, e.g. 0x8769 (EXIF) and 0x8825 (GPS).
 */
export function tiff(entries: TiffValue[]): Uint8Array {
  const out: number[] = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8];
  const u16 = (at: number, v: number) => out.splice(at, 2, v >> 8, v & 255);
  const u32 = (at: number, v: number) =>
    out.splice(at, 4, v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);

  function writeIfd(list: TiffValue[]): number {
    const start = out.length;
    out.push(
      list.length >> 8,
      list.length & 255,
      ...new Array<number>(list.length * 12 + 4).fill(0),
    );
    list.forEach((entry, i) => {
      const at = start + 2 + i * 12;
      u16(at, entry.tag);
      if ("short" in entry) {
        u16(at + 2, 3);
        u32(at + 4, 1);
        u16(at + 8, entry.short);
      } else if ("ascii" in entry) {
        const data = [...bytesOf(entry.ascii), 0];
        u16(at + 2, 2);
        u32(at + 4, data.length);
        if (data.length <= 4) out.splice(at + 8, data.length, ...data);
        else {
          u32(at + 8, out.length);
          out.push(...data, ...(data.length & 1 ? [0] : []));
        }
      } else if ("rationals" in entry) {
        u16(at + 2, 5);
        u32(at + 4, entry.rationals.length);
        u32(at + 8, out.length);
        for (const [n, d] of entry.rationals) {
          const pos = out.length;
          out.push(0, 0, 0, 0, 0, 0, 0, 0);
          u32(pos, n);
          u32(pos + 4, d);
        }
      } else {
        u16(at + 2, 4);
        u32(at + 4, 1);
        u32(at + 8, writeIfd(entry.ifd));
      }
    });
    return start;
  }

  writeIfd(entries);
  return Uint8Array.from(out);
}

/** London, 51°30'26.5"N 0°7'39.9"W, with camera, dates and software: a typical phone photo. */
export const PHOTO_EXIF: TiffValue[] = [
  { tag: 0x010f, ascii: "Sprigphone" }, // Make
  { tag: 0x0110, ascii: "Sprig 15 Pro" }, // Model
  { tag: 0x0112, short: 6 }, // Orientation: rotate 90° clockwise to view
  { tag: 0x0131, ascii: "SprigOS 18.1" }, // Software
  { tag: 0x0132, ascii: "2026:10:20 14:31:07" }, // DateTime
  { tag: 0x8769, ifd: [{ tag: 0x9003, ascii: "2026:10:20 14:31:07" }] }, // DateTimeOriginal
  {
    tag: 0x8825, // GPS
    ifd: [
      { tag: 0x0001, ascii: "N" },
      {
        tag: 0x0002,
        rationals: [
          [51, 1],
          [30, 1],
          [265, 10],
        ],
      },
      { tag: 0x0003, ascii: "W" },
      {
        tag: 0x0004,
        rationals: [
          [0, 1],
          [7, 1],
          [399, 10],
        ],
      },
    ],
  },
];

/** PHOTO_EXIF without the orientation tag. */
export const UPRIGHT_PHOTO_EXIF = PHOTO_EXIF.filter((entry) => entry.tag !== 0x0112);

function jpegSegmentBytes(marker: number, payload: number[] | Uint8Array): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 255, ...payload];
}

/** Inserts marker segments after the JPEG's SOI marker and its JFIF segment, if any. */
export function withJpegSegments(jpeg: Uint8Array, segments: number[][]): Uint8Array {
  const at = jpeg[3] === 0xe0 ? 4 + ((jpeg[4]! << 8) | jpeg[5]!) : 2;
  return Uint8Array.from([...jpeg.subarray(0, at), ...segments.flat(), ...jpeg.subarray(at)]);
}

/** An APP13 payload with one IPTC dataset, 2:80 By-line (the photographer). */
function photoshopIptc(byline: string): number[] {
  const dataset = [0x1c, 2, 80, 0, byline.length, ...bytesOf(byline)];
  if (dataset.length & 1) dataset.push(0);
  const size = dataset.length;
  return [
    ...bytesOf("Photoshop 3.0 "),
    ...bytesOf("8BIM"),
    ...[0x04, 0x04], // resource 0x0404: IPTC
    ...[0, 0], // empty name, padded to even
    ...[size >>> 24, (size >>> 16) & 255, (size >>> 8) & 255, size & 255],
    ...dataset,
  ];
}

export const XMP_PACKET =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmp:CreatorTool="Sprig Editor 2"/></rdf:RDF></x:xmpmeta>';

/**
 * The red/blue JPEG as a phone would save it: EXIF with GPS (and orientation
 * 6 unless `exif` says otherwise), XMP, IPTC, a comment and data after EOI.
 */
export function gpsJpeg(exif: TiffValue[] = PHOTO_EXIF): Uint8Array {
  const jpeg = withJpegSegments(redBlueJpeg(), [
    jpegSegmentBytes(0xe1, [...bytesOf("Exif\0\0"), ...tiff(exif)]),
    jpegSegmentBytes(0xe1, bytesOf(`http://ns.adobe.com/xap/1.0/\0${XMP_PACKET}`)),
    jpegSegmentBytes(0xed, photoshopIptc("Sprig Studio")),
    jpegSegmentBytes(0xfe, bytesOf("Taken at home")),
  ]);
  return Uint8Array.from([...jpeg, ...bytesOf("TRAILER")]);
}

/** Adds chunks right before a PNG's IEND chunk. */
export function withPngChunks(png: Uint8Array, chunks: [string, Uint8Array][]): Uint8Array {
  const iend = png.length - 12;
  return Uint8Array.from([
    ...png.subarray(0, iend),
    ...chunks.flatMap(([type, data]) => chunk(type, data)),
    ...png.subarray(iend),
  ]);
}

/** The half-transparent PNG with eXIf (GPS), a Software text chunk, a comment (iTXt) and tIME. */
export function metadataPng(): Uint8Array {
  return withPngChunks(halfTransparentPng(), [
    ["eXIf", tiff(UPRIGHT_PHOTO_EXIF)],
    ["tEXt", Uint8Array.from(bytesOf("Software\0Sprig Editor 2"))],
    ["iTXt", Uint8Array.from(bytesOf("Comment\0\0\0\0\0Holiday"))],
    ["tIME", Uint8Array.from([0x07, 0xea, 10, 20, 14, 31, 7])],
  ]);
}

function riff(fourcc: string, data: number[] | Uint8Array): number[] {
  const size = data.length;
  return [
    ...bytesOf(fourcc),
    size & 255,
    (size >>> 8) & 255,
    (size >>> 16) & 255,
    size >>> 24,
    ...data,
    ...(size & 1 ? [0] : []),
  ];
}

/** The tiny WebP in the extended format (VP8X) with EXIF (GPS) and XMP chunks. */
export function metadataWebp(): Uint8Array {
  const vp8 = Array.from(tinyWebp().subarray(12)); // the "VP8 " chunk
  // VP8X: flags EXIF (0x08) | XMP (0x04); canvas 16 × 8, stored minus one in 24 bits.
  const vp8x = riff("VP8X", [0x0c, 0, 0, 0, 15, 0, 0, 7, 0, 0]);
  const body = [
    ...bytesOf("WEBP"),
    ...vp8x,
    ...vp8,
    ...riff("EXIF", tiff(UPRIGHT_PHOTO_EXIF)),
    ...riff("XMP ", bytesOf(XMP_PACKET)),
  ];
  const size = body.length;
  return Uint8Array.from([
    ...bytesOf("RIFF"),
    size & 255,
    (size >>> 8) & 255,
    (size >>> 16) & 255,
    size >>> 24,
    ...body,
  ]);
}
