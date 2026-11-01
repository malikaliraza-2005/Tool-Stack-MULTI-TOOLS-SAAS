import exifr from "exifr";
import { describe, expect, it } from "vitest";
import {
  gpsJpeg,
  halfTransparentPng,
  metadataPng,
  metadataWebp,
  PHOTO_EXIF,
  redBlueJpeg,
  tiff,
  tinyWebp,
  UPRIGHT_PHOTO_EXIF,
  withExifOrientation,
  withPngChunks,
} from "@/lib/files/__fixtures__/images";
import { detectFileType } from "@/lib/files/sniff";
import {
  findMetadata,
  hasMetadata,
  jpegOrientation,
  jpegScanData,
  orientationOnlyTiff,
  readOrientation,
  stripMetadata,
  tiffOrientation,
} from "./metadata";

const KEEP = { keepOrientation: true };
const ALL = { keepOrientation: false };
const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);
/** Everything exifr can find except JFIF, ICC and PNG IHDR, which are not personal data. */
const readAll = (bytes: Uint8Array) =>
  exifr.parse(bytes, {
    tiff: true,
    ifd1: true,
    xmp: true,
    iptc: true,
    jfif: false,
    icc: false,
    ihdr: false,
  });

describe("tiffOrientation", () => {
  it("reads the orientation tag in either byte order", () => {
    expect(tiffOrientation(orientationOnlyTiff(6))).toBe(6);
    expect(tiffOrientation(tiff(PHOTO_EXIF))).toBe(6);
    const little = Uint8Array.from([
      0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(tiffOrientation(little)).toBe(8);
  });

  it("returns 1 when absent, out of range or unreadable", () => {
    expect(tiffOrientation(tiff(UPRIGHT_PHOTO_EXIF))).toBe(1);
    expect(tiffOrientation(orientationOnlyTiff(9))).toBe(1);
    expect(tiffOrientation(Uint8Array.from([1, 2, 3]))).toBe(1);
  });
});

describe("JPEG", () => {
  it("finds EXIF, XMP, IPTC and comments", () => {
    const blocks = findMetadata(gpsJpeg(), "jpeg");
    expect(blocks.exif && tiffOrientation(blocks.exif)).toBe(6);
    expect(blocks).toMatchObject({ xmp: true, iptc: true, comments: 1, other: 0 });
    expect(hasMetadata(blocks)).toBe(true);
    expect(hasMetadata(findMetadata(redBlueJpeg(), "jpeg"))).toBe(false);
  });

  it("keeps only the orientation by default; the scan data is byte-identical", async () => {
    const input = gpsJpeg();
    const output = stripMetadata(input, "jpeg", KEEP);
    expect(jpegScanData(output)).toEqual(jpegScanData(input));
    expect(jpegOrientation(output)).toBe(6);
    expect(await exifr.gps(output)).toBeUndefined();
    const left = await readAll(output);
    expect(left).toEqual({ Orientation: "Rotate 90 CW" });
    expect(text(output)).not.toMatch(/Sprig|Taken at home|TRAILER|Photoshop/);
    expect(detectFileType(output)).toBe("jpeg");
  });

  it("removes everything, orientation included, when asked", async () => {
    const output = stripMetadata(gpsJpeg(), "jpeg", ALL);
    expect(jpegOrientation(output)).toBe(1);
    expect(await readAll(output)).toBeUndefined();
    expect(hasMetadata(findMetadata(output, "jpeg"))).toBe(false);
  });

  it("keeps JFIF and the ICC profile, which only describe how to show the pixels", () => {
    const input = gpsJpeg(); // redBlueJpeg starts with JFIF APP0 and an ICC APP2
    const output = stripMetadata(input, "jpeg", ALL);
    expect(text(output)).toContain("JFIF");
    expect(text(output)).toContain("ICC_PROFILE");
    // JFIF stays first: the orientation segment goes after it.
    const kept = stripMetadata(input, "jpeg", KEEP);
    expect(Array.from(kept.subarray(2, 4))).toEqual([0xff, 0xe0]);
  });

  it("returns a clean file unchanged, apart from data after the end", () => {
    const clean = redBlueJpeg();
    expect(stripMetadata(clean, "jpeg", KEEP)).toEqual(clean);
    expect(stripMetadata(withExifOrientation(clean, 1), "jpeg", KEEP)).toEqual(clean);
  });

  it("rejects a file that isn't a JPEG", () => {
    expect(() => stripMetadata(halfTransparentPng(), "jpeg", KEEP)).toThrow();
    expect(() => stripMetadata(Uint8Array.from([0xff, 0xd8, 0x12]), "jpeg", KEEP)).toThrow();
  });
});

describe("PNG", () => {
  it("finds eXIf, text chunks and tIME", () => {
    const blocks = findMetadata(metadataPng(), "png");
    expect(blocks.exif).toBeDefined();
    expect(blocks.text).toEqual(["Software", "Comment"]);
    expect(blocks.time).toBe(true);
  });

  it("removes them and leaves the image chunks untouched", async () => {
    expect(await exifr.gps(metadataPng())).toMatchObject({ latitude: expect.closeTo(51.507, 3) });
    const output = stripMetadata(metadataPng(), "png", KEEP);
    expect(output).toEqual(halfTransparentPng());
    expect(await readAll(output)).toBeUndefined();
  });

  it("keeps a non-default orientation as a minimal eXIf chunk", async () => {
    const rotated = withPngChunks(halfTransparentPng(), [["eXIf", tiff(PHOTO_EXIF)]]);
    const output = stripMetadata(rotated, "png", KEEP);
    expect(readOrientation(output, "png")).toBe(6);
    expect(await readAll(output)).toEqual({ Orientation: "Rotate 90 CW" });
    expect(readOrientation(stripMetadata(rotated, "png", ALL), "png")).toBe(1);
  });
});

describe("WebP", () => {
  it("finds the EXIF and XMP chunks", () => {
    const blocks = findMetadata(metadataWebp(), "webp");
    expect(blocks.exif).toBeDefined();
    expect(blocks.xmp).toBe(true);
    expect(hasMetadata(findMetadata(tinyWebp(), "webp"))).toBe(false);
  });

  it("removes them, clears the VP8X flags and fixes the RIFF size", () => {
    const output = stripMetadata(metadataWebp(), "webp", KEEP);
    const view = new DataView(output.buffer);
    expect(text(output.subarray(0, 4))).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(output.length - 8);
    expect(text(output.subarray(12, 16))).toBe("VP8X");
    expect(output[20]! & 0x0c).toBe(0);
    expect(hasMetadata(findMetadata(output, "webp"))).toBe(false);
    expect(text(output)).not.toContain("Sprig");
    // The image chunk is copied as is.
    expect(text(output)).toContain(text(tinyWebp().subarray(12)));
  });
});
