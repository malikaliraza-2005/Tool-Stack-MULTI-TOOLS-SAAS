import { beforeAll, describe, expect, it } from "vitest";
import { redBlueJpeg, withExifOrientation } from "@/lib/files/__fixtures__/images";
import { loadNodeCodecs } from "@/lib/image/__fixtures__/node-codecs";
import { codecs } from "@/lib/image/codecs";
import { readImageInfo } from "@/lib/image/formats";
import { decodeUpright, processImage } from "@/lib/image/pipeline";
import {
  constrainCrop,
  cropPixels,
  defaultCrop,
  planResize,
  proportional,
  resizedName,
  resizeSettings,
  type ResizeSettings,
} from "./logic";

beforeAll(loadNodeCodecs, 30_000);

const BASE: ResizeSettings = {
  by: "pixels",
  width: null,
  height: null,
  keepProportions: true,
  fit: "inside",
  percent: 50,
  dontEnlarge: true,
};
const photo = { width: 4000, height: 3000 };
const plan = (s: Partial<ResizeSettings>, source = photo) => planResize(source, { ...BASE, ...s });

describe("planResize", () => {
  it("keeps proportions from one side, rounding to the nearest pixel", () => {
    expect(plan({ width: 1920 }).output).toEqual({ width: 1920, height: 1440 });
    expect(plan({ height: 1000 }).output).toEqual({ width: 1333, height: 1000 });
    expect(proportional({ width: 1001, height: 999 }, "width", 500)).toEqual({
      width: 500,
      height: 499,
    });
  });

  it("fits inside a box, or fills it with a centre crop", () => {
    expect(plan({ width: 1080, height: 1080 }).output).toEqual({ width: 1080, height: 810 });
    const fill = plan({ width: 1080, height: 1080, fit: "fill" });
    expect(fill.output).toEqual({ width: 1080, height: 1080 });
    expect(fill.crop).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
  });

  it("uses exact sizes when proportions are not kept", () => {
    expect(plan({ width: 800, height: 800, keepProportions: false }).output).toEqual({
      width: 800,
      height: 800,
    });
    expect(plan({ width: 800, keepProportions: false }).output).toEqual({
      width: 800,
      height: 3000,
    });
  });

  it("scales by percentage", () => {
    expect(plan({ by: "percent", percent: 25 }).output).toEqual({ width: 1000, height: 750 });
  });

  it("doesn't enlarge unless allowed", () => {
    const small = { width: 800, height: 600 };
    expect(plan({ width: 1920 }, small)).toMatchObject({ output: small, limited: true });
    expect(plan({ width: 1920, dontEnlarge: false }, small).output).toEqual({
      width: 1920,
      height: 1440,
    });
    expect(plan({ by: "percent", percent: 200 }, small).limited).toBe(true);
  });

  it("leaves the size alone when nothing is set", () => {
    expect(plan({}).output).toEqual(photo);
  });
});

describe("crop rectangles", () => {
  it("starts with the largest centred rectangle of the aspect", () => {
    expect(defaultCrop(photo, "1:1")).toEqual({ x: 0.125, y: 0, width: 0.75, height: 1 });
    expect(defaultCrop(photo, "free")).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    const wide = cropPixels(defaultCrop(photo, "16:9"), photo);
    expect(wide).toEqual({ x: 0, y: 375, width: 4000, height: 2250 });
  });

  it("keeps the crop inside the image and the aspect fixed", () => {
    const moved = constrainCrop({ x: 0.9, y: -0.2, width: 0.5, height: 0.2 }, photo, "1:1");
    const px = cropPixels(moved, photo);
    expect(px.width).toBe(px.height);
    expect(moved.x + moved.width).toBeCloseTo(1);
    expect(moved.y).toBe(0);
  });

  it("rounds to whole pixels inside the image", () => {
    expect(
      cropPixels({ x: 0.1, y: 0.1, width: 0.95, height: 0.5 }, { width: 100, height: 10 }),
    ).toEqual({
      x: 10,
      y: 1,
      width: 90,
      height: 5,
    });
  });
});

describe("pipeline (acceptance, tool-specifications §4.3)", () => {
  it("produces exact output dimensions", async () => {
    const bytes = redBlueJpeg();
    const info = readImageInfo(bytes)!;
    const out = await processImage(
      { name: "a", bytes: bytes.slice().buffer as ArrayBuffer },
      info,
      resizeSettings(
        info,
        { ...BASE, width: 30, height: 30, fit: "fill", dontEnlarge: false },
        "png",
        85,
      ),
      codecs,
    );
    expect(out).toMatchObject({ width: 30, height: 30, format: "png" });
  });

  it("applies EXIF orientation before cropping", async () => {
    // Stored 40 × 20 red|blue; orientation 6 shows it 20 × 40 with red on top.
    const bytes = withExifOrientation(redBlueJpeg(), 6);
    const info = readImageInfo(bytes)!;
    const top = cropPixels({ x: 0, y: 0, width: 1, height: 0.5 }, info);
    expect(top).toEqual({ x: 0, y: 0, width: 20, height: 20 });
    const out = await processImage(
      { name: "a", bytes: bytes.slice().buffer as ArrayBuffer },
      info,
      { format: "png", quality: 85, crop: top },
      codecs,
    );
    const pixels = await decodeUpright(
      "o",
      out.bytes,
      readImageInfo(new Uint8Array(out.bytes))!,
      codecs,
    );
    expect(pixels.data[(10 * 20 + 10) * 4]).toBeGreaterThan(200); // red
    expect(pixels.data[(10 * 20 + 10) * 4 + 2]).toBeLessThan(60);
  });

  it("names outputs by mode", () => {
    expect(resizedName("a.jpg", "resize", "jpeg")).toBe("a-resized.jpg");
    expect(resizedName("a.jpg", "crop", "webp")).toBe("a-cropped.webp");
  });
});
