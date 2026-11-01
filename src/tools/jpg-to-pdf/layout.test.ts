import { describe, expect, it } from "vitest";
import {
  jpegOrientation,
  orientationMatrix,
  placeImage,
  swapsSides,
  type LayoutOptions,
} from "./layout";

const opts = (patch: Partial<LayoutOptions> = {}): LayoutOptions => ({
  pageSize: "fit",
  orientation: "auto",
  margin: "none",
  ...patch,
});

describe("placeImage", () => {
  it("fit to image: page is the image size (96 dpi) plus margins", () => {
    expect(placeImage(800, 600, opts())).toEqual({
      page: [600, 450],
      x: 0,
      y: 0,
      width: 600,
      height: 450,
    });
    expect(placeImage(800, 600, opts({ margin: "small" }))).toEqual({
      page: [624, 474],
      x: 12,
      y: 12,
      width: 600,
      height: 450,
    });
  });

  it("fit to image: huge images are scaled to the largest PDF page", () => {
    const placed = placeImage(40_000, 10_000, opts());
    expect(placed.page[0]).toBeCloseTo(14_400);
    expect(placed.width / placed.height).toBeCloseTo(4);
  });

  it("A4 with a margin places the image inside the bounds, centred", () => {
    const placed = placeImage(1000, 2000, opts({ pageSize: "a4", margin: "large" }));
    expect(placed.page).toEqual([595.28, 841.89]);
    expect(placed.x).toBeGreaterThanOrEqual(36);
    expect(placed.y).toBeCloseTo(36);
    expect(placed.x + placed.width).toBeLessThanOrEqual(595.28 - 36 + 1e-9);
    expect(placed.y + placed.height).toBeCloseTo(841.89 - 36);
    expect(placed.x).toBeCloseTo((595.28 - placed.width) / 2);
  });

  it("orientation: auto follows the image; portrait and landscape force it", () => {
    expect(placeImage(1600, 900, opts({ pageSize: "letter" })).page).toEqual([792, 612]);
    expect(placeImage(900, 1600, opts({ pageSize: "letter" })).page).toEqual([612, 792]);
    expect(
      placeImage(1600, 900, opts({ pageSize: "letter", orientation: "portrait" })).page,
    ).toEqual([612, 792]);
    expect(
      placeImage(900, 1600, opts({ pageSize: "letter", orientation: "landscape" })).page,
    ).toEqual([792, 612]);
  });
});

describe("orientationMatrix", () => {
  const box = { x: 10, y: 20, width: 100, height: 50 };
  /** Where the stored image's corner (u, v) lands on the page. */
  const at = (orientation: number, u: number, v: number) => {
    const [a, b, c, d, e, f] = orientationMatrix(orientation, box);
    return [a * u + c * v + e, b * u + d * v + f];
  };
  const TL: [number, number] = [10, 70];
  const TR: [number, number] = [110, 70];
  const BL: [number, number] = [10, 20];
  const BR: [number, number] = [110, 20];

  it.each([
    // [orientation, where the stored top-left, top-right and bottom-left corners end up]
    [1, TL, TR, BL],
    [2, TR, TL, BR],
    [3, BR, BL, TR],
    [4, BL, BR, TL],
    [5, TL, BL, TR],
    [6, TR, BR, TL],
    [7, BR, TR, BL],
    [8, BL, TL, BR],
  ] as const)("orientation %i", (orientation, topLeft, topRight, bottomLeft) => {
    expect(at(orientation, 0, 1)).toEqual(topLeft);
    expect(at(orientation, 1, 1)).toEqual(topRight);
    expect(at(orientation, 0, 0)).toEqual(bottomLeft);
  });

  it("swaps sides for 5–8", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(swapsSides)).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ]);
  });
});

/** A JPEG header with an EXIF APP1 segment carrying `orientation`. */
function jpegWithOrientation(orientation: number, little = false): Uint8Array {
  const tiff = little
    ? [
        0x49,
        0x49,
        0x2a,
        0x00,
        0x08,
        0,
        0,
        0,
        0x01,
        0x00,
        0x12,
        0x01,
        0x03,
        0x00,
        1,
        0,
        0,
        0,
        orientation,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]
    : [
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
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const length = exif.length + 2;
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xe1,
    length >> 8,
    length & 0xff,
    ...exif,
    0xff,
    0xda,
    0,
    2,
  ]);
}

describe("jpegOrientation", () => {
  it("reads big- and little-endian EXIF", () => {
    expect(jpegOrientation(jpegWithOrientation(6))).toBe(6);
    expect(jpegOrientation(jpegWithOrientation(8, true))).toBe(8);
  });

  it("defaults to 1 without EXIF, for non-JPEGs and invalid values", () => {
    expect(jpegOrientation(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
    expect(jpegOrientation(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(jpegOrientation(jpegWithOrientation(9))).toBe(1);
    expect(jpegOrientation(jpegWithOrientation(6).slice(0, 14))).toBe(1);
  });
});
