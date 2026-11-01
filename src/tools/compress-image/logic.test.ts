import { beforeAll, describe, expect, it } from "vitest";
import { gpsJpeg, makePng, UPRIGHT_PHOTO_EXIF } from "@/lib/files/__fixtures__/images";
import { loadNodeCodecs } from "@/lib/image/__fixtures__/node-codecs";
import { codecs } from "@/lib/image/codecs";
import { readImageInfo, type ImageInfo } from "@/lib/image/formats";
import { findMetadata, hasMetadata } from "@/lib/image/metadata";
import { processImage } from "@/lib/image/pipeline";
import { fitWithin } from "@/lib/image/sizing";
import {
  canKeepMetadata,
  compressedName,
  compressNote,
  compressSettings,
  outputFormat,
  percentSaved,
  type CompressOptions,
} from "./logic";

beforeAll(loadNodeCodecs, 30_000);

const DEFAULTS: CompressOptions = {
  format: "same",
  quality: 75,
  maxDimension: 0,
  stripMetadata: true,
};

const info = (kind: ImageInfo["kind"], width = 4000, height = 3000): ImageInfo => ({
  kind,
  width,
  height,
  orientation: 1,
  alpha: false,
  animated: false,
});

/** A photo-like PNG that compresses well as JPEG. */
const photo = (size: number) =>
  makePng(size, size, (x, y) => [
    128 + Math.round(100 * Math.sin(x / 7)),
    128 + Math.round(100 * Math.cos(y / 9)),
    (x * y) % 256,
    255,
  ]);

async function compress(bytes: Uint8Array, options: Partial<CompressOptions> = {}) {
  const imageInfo = readImageInfo(bytes)!;
  return processImage(
    { name: "in", bytes: bytes.slice().buffer as ArrayBuffer },
    imageInfo,
    compressSettings(imageInfo, { ...DEFAULTS, ...options }),
    codecs,
  );
}

describe("settings", () => {
  it("keeps the input format by default", () => {
    expect(outputFormat("png", "same")).toBe("png");
    expect(outputFormat("avif", "same")).toBe("avif");
    expect(outputFormat("png", "webp")).toBe("webp");
  });

  it("resizes only with a max dimension below the image size", () => {
    expect(compressSettings(info("jpeg"), DEFAULTS).resize).toBeUndefined();
    expect(compressSettings(info("jpeg"), { ...DEFAULTS, maxDimension: 2000 }).resize).toEqual({
      width: 2000,
      height: 1500,
    });
    expect(
      compressSettings(info("jpeg", 800, 600), { ...DEFAULTS, maxDimension: 2000 }).resize,
    ).toBeUndefined();
  });

  it("allows keeping metadata only for JPG to JPG", () => {
    expect(canKeepMetadata("jpeg", DEFAULTS)).toBe(true);
    expect(canKeepMetadata("jpeg", { ...DEFAULTS, format: "webp" })).toBe(false);
    expect(canKeepMetadata("png", DEFAULTS)).toBe(false);
  });

  it("fits within a longest side", () => {
    expect(fitWithin({ width: 3000, height: 4000 }, 1000)).toEqual({ width: 750, height: 1000 });
    expect(fitWithin({ width: 10, height: 10 }, 0)).toEqual({ width: 10, height: 10 });
  });
});

describe("names and notes", () => {
  it("names outputs <original>-compressed.<ext>", () => {
    expect(compressedName("photo.JPG", "jpeg")).toBe("photo-compressed.jpg");
    expect(compressedName("logo.png", "webp")).toBe("logo-compressed.webp");
  });

  it("describes the saving", () => {
    expect(percentSaved(1000, 380)).toBe(62);
    expect(compressNote(2_000_000, 500_000, false)).toMatch(/→ .* \(−75%\)$/);
    expect(compressNote(1000, 1000, true)).toBe("Already well optimized, original kept");
  });
});

describe("acceptance (tool-specifications §4.1)", () => {
  it("JPEG at q75 is smaller than a high-quality JPEG", async () => {
    const high = await compress(photo(96), { format: "jpeg", quality: 98 });
    const out = await compress(new Uint8Array(high.bytes));
    expect(out.keptOriginal).toBe(false);
    expect(out.bytes.byteLength).toBeLessThan(high.bytes.byteLength);
  });

  it("PNG output decodes to identical pixels", async () => {
    const input = photo(32);
    const out = await compress(input);
    expect(out.format).toBe("png");
    const before = await codecs.decode(input.slice().buffer as ArrayBuffer, "png");
    const after = await codecs.decode(out.bytes, "png");
    expect(after.pixels.data).toEqual(before.pixels.data);
  });

  it("keeps the original when the result is larger", async () => {
    const small = await compress(photo(64), { format: "jpeg", quality: 30 });
    const out = await compress(new Uint8Array(small.bytes), { quality: 100 });
    expect(out.keptOriginal).toBe(true);
    expect(out.bytes.byteLength).toBe(small.bytes.byteLength);
  });

  it("batch of 10 completes with correct totals", async () => {
    const inputs = Array.from({ length: 10 }, (_, i) => photo(40 + i * 4));
    const results = await Promise.all(inputs.map((input) => compress(input, { format: "jpeg" })));
    const before = inputs.reduce((sum, b) => sum + b.byteLength, 0);
    const after = results.reduce((sum, r) => sum + r.bytes.byteLength, 0);
    expect(results).toHaveLength(10);
    expect(after).toBeLessThan(before);
    expect(after).toBe(results.map((r) => r.bytes.byteLength).reduce((a, b) => a + b));
  });

  it("strips metadata when on, keeps it (JPG to JPG) when off", async () => {
    const tagged = gpsJpeg(UPRIGHT_PHOTO_EXIF);
    const stripped = await compress(tagged, { quality: 50 });
    expect(hasMetadata(findMetadata(new Uint8Array(stripped.bytes), "jpeg"))).toBe(false);
    const kept = await compress(tagged, { quality: 50, stripMetadata: false });
    expect(findMetadata(new Uint8Array(kept.bytes), "jpeg").exif).toBeDefined();
  });
});
