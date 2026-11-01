import { beforeAll, describe, expect, it } from "vitest";
import {
  gif,
  halfTransparentPng,
  heic,
  makeBmp,
  makeGif,
  redBlueJpeg,
  tinyAvif,
  tinyWebp,
} from "@/lib/files/__fixtures__/images";
import { loadNodeCodecs } from "@/lib/image/__fixtures__/node-codecs";
import { codecs } from "@/lib/image/codecs";
import { readImageInfo, type OutputFormat } from "@/lib/image/formats";
import { decodeUpright, processImage } from "@/lib/image/pipeline";
import {
  animationWarning,
  backgroundApplies,
  convertedName,
  convertNote,
  convertSettings,
  type ConvertOptions,
} from "./logic";

beforeAll(loadNodeCodecs, 30_000);

const DEFAULTS: ConvertOptions = { format: "auto", quality: 85, background: "#ffffff" };

async function convert(bytes: Uint8Array, options: Partial<ConvertOptions> = {}) {
  const info = readImageInfo(bytes)!;
  return processImage(
    { name: "in", bytes: bytes.slice().buffer as ArrayBuffer },
    info,
    convertSettings({ ...DEFAULTS, ...options }),
    codecs,
  );
}

async function pixel(bytes: ArrayBuffer, x: number, y: number) {
  const pixels = await decodeUpright("o", bytes, readImageInfo(new Uint8Array(bytes))!, codecs);
  const i = (y * pixels.width + x) * 4;
  return Array.from(pixels.data.subarray(i, i + 4));
}

const near = (a: number[], b: number[], t = 40) => a.every((v, i) => Math.abs(v - b[i]!) <= t);

describe("format pairs (tool-specifications §4.2)", () => {
  const inputs = {
    jpeg: redBlueJpeg(),
    png: halfTransparentPng(),
    webp: tinyWebp(),
    avif: tinyAvif(),
    heic: heic(),
    gif: makeGif(8, 6, (x) => x % 4),
    bmp: makeBmp(8, 6, (x) => [x * 30, 100, 200]),
  };
  for (const [kind, bytes] of Object.entries(inputs)) {
    for (const format of ["jpeg", "png", "webp", "avif"] as OutputFormat[]) {
      it(`${kind} → ${format}`, async () => {
        const out = await convert(bytes, { format });
        const info = readImageInfo(new Uint8Array(out.bytes));
        expect(info).toMatchObject({ kind: format, width: readImageInfo(bytes)!.width });
      });
    }
  }

  it("Auto picks PNG for transparent images and JPG otherwise", async () => {
    expect((await convert(halfTransparentPng())).format).toBe("png");
    expect((await convert(redBlueJpeg())).format).toBe("jpeg");
    expect((await convert(heic())).format).toBe("jpeg");
  });

  it("fills transparency with the background colour for JPG", async () => {
    const out = await convert(halfTransparentPng(), { format: "jpeg", background: "#ff00ff" });
    expect(out.flattened).toBe(true);
    expect(near(await pixel(out.bytes, 13, 8), [255, 0, 255, 255])).toBe(true);
    expect(near(await pixel(out.bytes, 2, 8), [0, 160, 0, 255])).toBe(true);
  });

  it("converts the first frame of an animated GIF and warns", async () => {
    const info = readImageInfo(gif(2))!;
    expect(animationWarning(info)).toMatch(/first frame only/);
    const out = await processImage(
      { name: "a", bytes: gif(2).slice().buffer as ArrayBuffer },
      info,
      convertSettings({ ...DEFAULTS, format: "png" }),
      codecs,
    );
    expect(out).toMatchObject({ width: 1, height: 1, format: "png" });
  });
});

describe("names and notes", () => {
  it("keeps the name and changes the extension", () => {
    expect(convertedName("IMG_1234.HEIC", "heic", "jpeg")).toBe("IMG_1234.jpg");
    expect(convertedName("logo.png", "png", "png")).toBe("logo-converted.png");
  });

  it("describes the conversion", () => {
    expect(convertNote("heic", "jpeg", false)).toBe("HEIC → JPG");
    expect(convertNote("png", "jpeg", true)).toBe("PNG → JPG · transparent areas filled");
  });

  it("shows the background only when it can matter", () => {
    const transparent = readImageInfo(halfTransparentPng())!;
    const opaque = readImageInfo(redBlueJpeg())!;
    expect(backgroundApplies([transparent], "jpeg")).toBe(true);
    expect(backgroundApplies([transparent], "auto")).toBe(false);
    expect(backgroundApplies([opaque], "jpeg")).toBe(false);
  });
});
