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
