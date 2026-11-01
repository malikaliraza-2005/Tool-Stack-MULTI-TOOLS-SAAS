import { describe, expect, it } from "vitest";
import {
  clampRect,
  createPixels,
  crop,
  flatten,
  hasTransparency,
  orient,
  parseHexColor,
  type Pixels,
} from "./pixels";

/** A 3 × 2 image whose red channel numbers the pixels 1–6, row by row. */
function numbered(): Pixels {
  const p = createPixels(3, 2);
  for (let i = 0; i < 6; i++) {
    p.data[i * 4] = i + 1;
    p.data[i * 4 + 3] = 255;
  }
  return p;
}

const rows = (p: Pixels) =>
  Array.from({ length: p.height }, (_, y) =>
    Array.from({ length: p.width }, (_, x) => p.data[(y * p.width + x) * 4]),
  );

describe("orient", () => {
  // Stored:
  // 1 2 3
  // 4 5 6
  it.each([
    [
      1,
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
    ],
    [
      2,
      [
        [3, 2, 1],
        [6, 5, 4],
      ],
    ],
    [
      3,
      [
        [6, 5, 4],
        [3, 2, 1],
      ],
    ],
    [
      4,
      [
        [4, 5, 6],
        [1, 2, 3],
      ],
    ],
    [
      5,
      [
        [1, 4],
        [2, 5],
        [3, 6],
      ],
    ],
    [
      6,
      [
        [4, 1],
        [5, 2],
        [6, 3],
      ],
    ],
    [
      7,
      [
        [6, 3],
        [5, 2],
        [4, 1],
      ],
    ],
    [
      8,
      [
        [3, 6],
        [2, 5],
        [1, 4],
      ],
    ],
  ])("orientation %i", (orientation, expected) => {
    expect(rows(orient(numbered(), orientation))).toEqual(expected);
  });
});

describe("crop", () => {
  it("copies the rectangle", () => {
    expect(rows(crop(numbered(), { x: 1, y: 0, width: 2, height: 2 }))).toEqual([
      [2, 3],
      [5, 6],
    ]);
  });

  it("clamps to the image and to whole pixels", () => {
    expect(clampRect({ x: -5, y: 1.4, width: 99, height: 0.2 }, 3, 2)).toEqual({
      x: 0,
      y: 1,
      width: 3,
      height: 1,
    });
    const source = numbered();
    expect(crop(source, { x: 0, y: 0, width: 3, height: 2 })).toBe(source);
  });
});

describe("alpha", () => {
  it("detects transparency and flattens onto a background", () => {
    const p = createPixels(2, 1);
    p.data.set([200, 0, 0, 255, 0, 0, 200, 0]);
    expect(hasTransparency(p)).toBe(true);
    const flat = flatten(p, [255, 255, 255]);
    expect(Array.from(flat.data)).toEqual([200, 0, 0, 255, 255, 255, 255, 255]);
    expect(hasTransparency(flat)).toBe(false);
  });

  it("parses hex colours", () => {
    expect(parseHexColor("#ff8000")).toEqual([255, 128, 0]);
    expect(parseHexColor("FFFFFF")).toEqual([255, 255, 255]);
    expect(parseHexColor("#fff")).toBeNull();
  });
});
