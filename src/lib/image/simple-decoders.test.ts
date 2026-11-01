import { describe, expect, it } from "vitest";
import { gif, makeBmp, makeGif } from "@/lib/files/__fixtures__/images";
import { decodeBmp, decodeGif } from "./simple-decoders";

const at = (p: { data: Uint8ClampedArray; width: number }, x: number, y: number) =>
  Array.from(p.data.subarray((y * p.width + x) * 4, (y * p.width + x) * 4 + 4));

const PALETTE = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 255],
];
/** Quadrants: red, green / blue, white. */
const quadrant = (w: number, h: number) => (x: number, y: number) =>
  (x < w / 2 ? 0 : 1) + (y < h / 2 ? 0 : 2);

describe("decodeGif", () => {
  it.each([false, true])("decodes the first frame (interlaced: %s)", (interlaced) => {
    const pixels = decodeGif(makeGif(20, 12, quadrant(20, 12), { interlaced }));
    expect([pixels.width, pixels.height]).toEqual([20, 12]);
    for (const [x, y] of [
      [2, 2],
      [17, 2],
      [2, 9],
      [17, 9],
    ] as const) {
      expect(at(pixels, x, y)).toEqual([...PALETTE[quadrant(20, 12)(x, y)]!, 255]);
    }
  });

  it("leaves the transparent index transparent", () => {
    const pixels = decodeGif(makeGif(4, 4, (x) => (x < 2 ? 0 : 3), { transparent: 3 }));
    expect(at(pixels, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(at(pixels, 3, 0)[3]).toBe(0);
  });

  it("takes only the first frame of an animation", () => {
    expect(at(decodeGif(gif(2)), 0, 0)).toEqual([0, 0, 0, 255]);
  });

  it("rejects damaged files", () => {
    expect(() => decodeGif(gif(2).subarray(0, 10))).toThrow();
  });
});

describe("decodeBmp", () => {
  it("decodes a bottom-up 24-bit BMP with row padding", () => {
    const pixels = decodeBmp(makeBmp(5, 3, (x, y) => [x * 50, y * 100, 7]));
    expect([pixels.width, pixels.height]).toEqual([5, 3]);
    expect(at(pixels, 0, 0)).toEqual([0, 0, 7, 255]);
    expect(at(pixels, 4, 2)).toEqual([200, 200, 7, 255]);
  });

  it("rejects truncated files", () => {
    expect(() => decodeBmp(makeBmp(5, 3, () => [0, 0, 0]).subarray(0, 60))).toThrow();
  });
});
