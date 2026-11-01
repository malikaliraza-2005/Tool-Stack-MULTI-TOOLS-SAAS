// Page geometry for JPG to PDF (tool-specifications §3.4). Pure: no DOM, no
// pdf-lib, so it is fully unit-tested.

export type PageSize = "fit" | "a4" | "letter";
export type Orientation = "auto" | "portrait" | "landscape";
export type Margin = "none" | "small" | "large";

export type LayoutOptions = { pageSize: PageSize; orientation: Orientation; margin: Margin };

/** PDF points (1/72 inch). */
const SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};
export const MARGINS: Record<Margin, number> = { none: 0, small: 12, large: 36 };

/** Image pixels to points for "Fit to image": 96 pixels per inch, as on screen. */
export const POINTS_PER_PIXEL = 0.75;
/** Largest page side PDF readers accept (200 inches). */
const MAX_PAGE = 14_400;

export type Placement = {
  page: [number, number];
  /** Where the (upright) image goes on the page: bottom-left corner and size, in points. */
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Page size and image box for an image of `width` × `height` pixels (as
 * displayed, after EXIF orientation). Fixed page sizes fit the image within
 * the margins, centred; "fit" makes the page the image size plus margins.
 */
export function placeImage(width: number, height: number, options: LayoutOptions): Placement {
  const margin = MARGINS[options.margin];
  if (options.pageSize === "fit") {
    let w = width * POINTS_PER_PIXEL;
    let h = height * POINTS_PER_PIXEL;
    // Very large images are scaled down to the largest page PDF readers accept.
    const scale = Math.min(1, (MAX_PAGE - 2 * margin) / w, (MAX_PAGE - 2 * margin) / h);
    w *= scale;
    h *= scale;
    return { page: [w + 2 * margin, h + 2 * margin], x: margin, y: margin, width: w, height: h };
  }
  const [short, long] = SIZES[options.pageSize];
  const landscape =
    options.orientation === "landscape" || (options.orientation === "auto" && width > height);
  const page: [number, number] = landscape ? [long, short] : [short, long];
  const boxW = page[0] - 2 * margin;
  const boxH = page[1] - 2 * margin;
  const scale = Math.min(boxW / width, boxH / height);
  const w = width * scale;
  const h = height * scale;
  return { page, x: (page[0] - w) / 2, y: (page[1] - h) / 2, width: w, height: h };
}

/**
 * The PDF transformation matrix [a b c d e f] that draws a stored JPEG with
 * EXIF `orientation` (1–8) upright into the box. The image's unit square
 * (u right, v up) maps to the box (p right, q up) as the orientation says.
 */
export function orientationMatrix(
  orientation: number,
  box: { x: number; y: number; width: number; height: number },
): [number, number, number, number, number, number] {
  // p = pu·u + pv·v + p0, q = qu·u + qv·v + q0
  const maps: Record<number, [number, number, number, number, number, number]> = {
    1: [1, 0, 0, 0, 1, 0],
    2: [-1, 0, 1, 0, 1, 0], // mirrored left-right
    3: [-1, 0, 1, 0, -1, 1], // rotated 180°
    4: [1, 0, 0, 0, -1, 1], // mirrored top-bottom
    5: [0, -1, 1, -1, 0, 1], // transposed
    6: [0, 1, 0, -1, 0, 1], // rotated 90° clockwise
    7: [0, 1, 0, 1, 0, 0], // transversed
    8: [0, -1, 1, 1, 0, 0], // rotated 90° anticlockwise
  };
  const [pu, pv, p0, qu, qv, q0] = maps[orientation] ?? maps[1]!;
  const { x, y, width: W, height: H } = box;
  return [W * pu, H * qu, W * pv, H * qv, x + W * p0, y + H * q0];
}

/** Orientations 5–8 swap width and height when displayed. */
export const swapsSides = (orientation: number) => orientation >= 5 && orientation <= 8;

/**
 * EXIF orientation (1–8) of a JPEG, read from its APP1 segment; 1 when absent.
 * Reads only the header, never the image data.
 */
export function jpegOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1]!;
    // Start of scan: image data follows, no more metadata.
    if (marker === 0xda || marker === 0xd9) return 1;
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && offset + 4 + 6 <= bytes.length) {
      const start = offset + 4;
      const isExif =
        bytes[start] === 0x45 &&
        bytes[start + 1] === 0x78 &&
        bytes[start + 2] === 0x69 &&
        bytes[start + 3] === 0x66;
      if (isExif) return readTiffOrientation(view, start + 6, start + length - 2);
    }
    offset += 2 + length;
  }
  return 1;
}

function readTiffOrientation(view: DataView, tiff: number, end: number): number {
  if (tiff + 8 > end || end > view.byteLength) return 1;
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > end) return 1;
  const entries = u16(ifd);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return 1;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}
