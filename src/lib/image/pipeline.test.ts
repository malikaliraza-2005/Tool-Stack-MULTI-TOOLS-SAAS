import { beforeAll, describe, expect, it } from "vitest";
import {
  gif,
  gpsJpeg,
  halfTransparentPng,
  makePng,
  metadataWebp,
  redBlueJpeg,
  tinyAvif,
  tinyWebp,
  withExifOrientation,
} from "@/lib/files/__fixtures__/images";
import { loadNodeCodecs } from "./__fixtures__/node-codecs";
import { codecs } from "./codecs";
import { readImageInfo, type ImageKind } from "./formats";
import { findMetadata, hasMetadata, jpegOrientation } from "./metadata";
import {
  checkPixels,
  decodeUpright,
  inspectImage,
  listKinds,
  processImage,
  savings,
  type ProcessOptions,
} from "./pipeline";

beforeAll(loadNodeCodecs, 30_000);

const ALL_KINDS: ImageKind[] = ["jpeg", "png", "webp", "gif", "bmp", "avif", "heic"];

const buffer = (bytes: Uint8Array) => bytes.slice().buffer as ArrayBuffer;

async function run(bytes: Uint8Array, options: ProcessOptions) {
  const info = inspectImage("photo", bytes, ALL_KINDS, "Test");
  return processImage({ name: "photo", bytes: buffer(bytes) }, info, options, codecs);
}

/** Pixel at (x, y) of a decoded output, as [r, g, b, a]. */
async function pixelAt(bytes: ArrayBuffer, x: number, y: number) {
  const info = readImageInfo(new Uint8Array(bytes))!;
  const pixels = await decodeUpright("out", bytes, info, codecs);
  const i = (y * pixels.width + x) * 4;
  return Array.from(pixels.data.subarray(i, i + 4));
}

const near = (actual: number[], expected: number[], tolerance = 40) =>
  actual.every((value, i) => Math.abs(value - expected[i]!) <= tolerance);

/** A noisy photo-like PNG: compresses poorly as PNG, well as JPEG. */
const noisy = (size = 64) =>
  makePng(size, size, (x, y) => [(x * 7 + y * 13) % 256, (x * y) % 256, (x ^ y) * 4, 255]);

describe("readImageInfo", () => {
  it("reads size, orientation, alpha and animation from headers", () => {
    expect(readImageInfo(redBlueJpeg())).toEqual({
      kind: "jpeg",
      width: 40,
      height: 20,
      orientation: 1,
      alpha: false,
      animated: false,
    });
    // EXIF orientation 6: stored 40 × 20, shown 20 × 40.
    expect(readImageInfo(withExifOrientation(redBlueJpeg(), 6))).toMatchObject({
      width: 20,
      height: 40,
      orientation: 6,
    });
    expect(readImageInfo(halfTransparentPng())).toMatchObject({
      width: 16,
      height: 16,
      alpha: true,
    });
    expect(readImageInfo(tinyWebp())).toMatchObject({ kind: "webp", width: 16, height: 8 });
    expect(readImageInfo(metadataWebp())).toMatchObject({ width: 16, height: 8, alpha: false });
    expect(readImageInfo(tinyAvif())).toMatchObject({ kind: "avif", width: 16, height: 8 });
    expect(readImageInfo(gif(2))).toMatchObject({
      kind: "gif",
      width: 1,
      height: 1,
      animated: true,
    });
    expect(readImageInfo(gif(1))).toMatchObject({ animated: false });
  });

  it("returns null for damaged headers and other types", () => {
    expect(readImageInfo(redBlueJpeg().subarray(0, 100))).toBeNull();
    expect(readImageInfo(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
  });
});

describe("inspectImage", () => {
  it("names the detected type when it isn't accepted", () => {
    expect(() => inspectImage("a.png", gif(), ["jpeg", "png", "webp"], "Remove EXIF")).toThrow(
      "a.png is a GIF image. Remove EXIF accepts JPG, PNG and WebP images.",
    );
    expect(() => inspectImage("a.jpg", new Uint8Array(8), ["jpeg"], "X")).toThrow(
      "a.jpg isn’t a supported file. X accepts JPG images.",
    );
  });

  it("reports a damaged image as corrupt", () => {
    expect(() => inspectImage("a.jpg", redBlueJpeg().subarray(0, 100), ["jpeg"], "X")).toThrow(
      "a.jpg couldn’t be read",
    );
  });

  it("lists kinds in plain English", () => {
    expect(listKinds(["jpeg"])).toBe("JPG images");
    expect(listKinds(["jpeg", "png", "avif"])).toBe("JPG, PNG and AVIF images");
  });
});

describe("checkPixels", () => {
  it("rejects images above the device's pixel limit with the numbers", () => {
    const info = {
      kind: "jpeg",
      width: 10_000,
      height: 8_000,
      orientation: 1,
      alpha: false,
      animated: false,
    } as const;
    expect(() => checkPixels("big.jpg", info, { maxPixels: 50e6 })).toThrow(
      "big.jpg is 10000 × 8000 (80 megapixels). The limit on this device is 50 megapixels.",
    );
    expect(() => checkPixels("big.jpg", info, { maxPixels: 100e6 })).not.toThrow();
  });
});

describe("processImage", () => {
  it("encodes every output format and decodes back to the same picture", async () => {
    for (const format of ["jpeg", "png", "webp", "avif"] as const) {
      const out = await run(redBlueJpeg(), { format, quality: 90 });
      expect(out.format).toBe(format);
      expect(readImageInfo(new Uint8Array(out.bytes))).toMatchObject({
        kind: format,
        width: 40,
        height: 20,
      });
      expect(near(await pixelAt(out.bytes, 5, 10), [255, 0, 0, 255])).toBe(true);
      expect(near(await pixelAt(out.bytes, 35, 10), [0, 0, 255, 255])).toBe(true);
    }
  });

  it("decodes every input format", async () => {
    for (const input of [tinyWebp(), tinyAvif(), halfTransparentPng(), redBlueJpeg()]) {
      const out = await run(input, { format: "png", quality: 75 });
      expect(out.width).toBeGreaterThan(0);
    }
  });

  it("JPEG at quality 75 is smaller than a high-quality JPEG", async () => {
    const high = await run(noisy(), { format: "jpeg", quality: 98 });
    const compressed = await run(new Uint8Array(high.bytes), { format: "jpeg", quality: 75 });
    expect(compressed.keptOriginal).toBe(false);
    expect(compressed.bytes.byteLength).toBeLessThan(high.bytes.byteLength);
  });

  it("lossless PNG output decodes to identical pixels", async () => {
    const input = halfTransparentPng();
    const out = await run(input, { format: "png", quality: 75 });
    const info = readImageInfo(input)!;
    const before = await decodeUpright("in", buffer(input), info, codecs);
    const after = await decodeUpright(
      "out",
      out.bytes,
      readImageInfo(new Uint8Array(out.bytes))!,
      codecs,
    );
    expect(after.data).toEqual(before.data);
  });

  it("keeps the original when the result is larger, without its metadata", async () => {
    const small = await run(noisy(), { format: "jpeg", quality: 40 });
    const input = withExifOrientation(new Uint8Array(small.bytes), 1);
    const out = await run(input, { format: "jpeg", quality: 100, keepOriginalIfLarger: true });
    expect(out.keptOriginal).toBe(true);
    expect(out.format).toBe("jpeg");
    expect(hasMetadata(findMetadata(new Uint8Array(out.bytes), "jpeg"))).toBe(false);
    expect(new Uint8Array(out.bytes)).toEqual(new Uint8Array(small.bytes));
  });

  it("doesn't keep the original when the size changed", async () => {
    const out = await run(redBlueJpeg(), {
      format: "jpeg",
      quality: 100,
      resize: { width: 80, height: 40 },
      keepOriginalIfLarger: true,
    });
    expect(out).toMatchObject({ keptOriginal: false, width: 80, height: 40 });
  });

  it("re-encoded output has no metadata unless asked; then the orientation is reset", async () => {
    const stripped = await run(gpsJpeg(), { format: "jpeg", quality: 80 });
    expect(hasMetadata(findMetadata(new Uint8Array(stripped.bytes), "jpeg"))).toBe(false);
    const kept = await run(gpsJpeg(), { format: "jpeg", quality: 80, keepMetadata: true });
    const blocks = findMetadata(new Uint8Array(kept.bytes), "jpeg");
    expect(blocks.exif).toBeDefined();
    expect(blocks.xmp).toBe(true);
    // The pixels were turned upright, so the tag must not turn them again.
    expect(jpegOrientation(new Uint8Array(kept.bytes))).toBe(1);
  });

  it("applies EXIF orientation: output is upright", async () => {
    const out = await run(withExifOrientation(redBlueJpeg(), 6), { format: "png", quality: 75 });
    expect(out).toMatchObject({ width: 20, height: 40 });
    // Rotated 90° clockwise: red (left) is now on top.
    expect(near(await pixelAt(out.bytes, 10, 5), [255, 0, 0, 255])).toBe(true);
    expect(near(await pixelAt(out.bytes, 10, 35), [0, 0, 255, 255])).toBe(true);
  });

  it("crops in upright coordinates, then resizes", async () => {
    const out = await run(withExifOrientation(redBlueJpeg(), 6), {
      format: "png",
      quality: 75,
      crop: { x: 0, y: 20, width: 20, height: 20 }, // the blue (lower) half
      resize: { width: 10, height: 10 },
    });
    expect(out).toMatchObject({ width: 10, height: 10 });
    expect(near(await pixelAt(out.bytes, 5, 5), [0, 0, 255, 255])).toBe(true);
  });

  it("flattens transparency onto the background for JPG", async () => {
    const out = await run(halfTransparentPng(), {
      format: "jpeg",
      quality: 95,
      background: [255, 0, 255],
    });
    expect(out.flattened).toBe(true);
    expect(near(await pixelAt(out.bytes, 2, 8), [0, 160, 0, 255])).toBe(true);
    expect(near(await pixelAt(out.bytes, 13, 8), [255, 0, 255, 255])).toBe(true);
    const png = await run(halfTransparentPng(), { format: "png", quality: 75 });
    expect(png.flattened).toBe(false);
  });

  it("reports damaged image data as corrupt", async () => {
    const broken = redBlueJpeg().slice(0, 700); // header intact, scan data cut short
    broken.fill(0, 650);
    await expect(run(broken, { format: "png", quality: 75 })).rejects.toThrow(
      /couldn’t be read|processing/,
    );
  });
});

describe("savings", () => {
  it("rounds the percentage saved", () => {
    expect(savings(1000, 380).percent).toBe(62);
    expect(savings(1000, 380).label).toMatch(/ → /);
    expect(savings(0, 10).percent).toBe(0);
  });
});
