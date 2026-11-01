import { decodePDFRawStream, PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { ToolError } from "@/lib/errors";
import {
  halfTransparentPng,
  redBlueJpeg,
  withExifOrientation,
} from "@/lib/files/__fixtures__/images";
import { imagesToPdf, type Decoder, type ImageInput, type LayoutOptions } from "./logic";

const FIT: LayoutOptions = { pageSize: "fit", orientation: "auto", margin: "none" };

const input = (name: string, bytes: Uint8Array): ImageInput => ({
  name,
  bytes: bytes.slice().buffer as ArrayBuffer,
});

/** A decoder stand-in for Node (the worker uses the browser): returns the red/blue JPEG. */
const fakeDecoder: Decoder = async () => ({
  format: "jpeg",
  bytes: redBlueJpeg().slice().buffer as ArrayBuffer,
});
const failingDecoder: Decoder = async () => {
  throw new Error("cannot decode");
};

async function pagesOf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => ({
    width: Math.round(page.getWidth() * 100) / 100,
    height: Math.round(page.getHeight() * 100) / 100,
  }));
}

/** The page's content stream text (drawing operators). */
async function contentOf(bytes: Uint8Array, index = 0) {
  const doc = await PDFDocument.load(bytes);
  // Contents is a stream or an array of them, usually behind references.
  const contents = doc.context.lookup(doc.getPages()[index]!.node.get(PDFName.of("Contents")));
  const items = contents instanceof PDFArray ? contents.asArray() : [contents];
  const streams = items
    .map((item) => doc.context.lookup(item))
    .filter((item): item is PDFRawStream => item instanceof PDFRawStream);
  return streams
    .map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode()))
    .join("\n");
}

async function expectToolError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ToolError);
  expect((error as ToolError).code).toBe(code);
  return error as ToolError;
}

describe("imagesToPdf", () => {
  it("makes one page per image, in order", async () => {
    const { bytes, pageCount } = await imagesToPdf(
      [
        input("a.jpg", redBlueJpeg()),
        input("b.png", halfTransparentPng()),
        input("c.jpg", redBlueJpeg()),
      ],
      FIT,
      fakeDecoder,
    );
    expect(pageCount).toBe(3);
    // Fit to image at 96 dpi: 40 × 20 px → 30 × 15 pt; 16 × 16 → 12 × 12.
    expect(await pagesOf(bytes)).toEqual([
      { width: 30, height: 15 },
      { width: 12, height: 12 },
      { width: 30, height: 15 },
    ]);
  });

  it("an EXIF-rotated JPEG gets an upright page and a rotating transform", async () => {
    const { bytes } = await imagesToPdf(
      [input("phone.jpg", withExifOrientation(redBlueJpeg(), 6))],
      FIT,
      fakeDecoder,
    );
    // Stored 40 × 20, displayed 20 × 40.
    expect(await pagesOf(bytes)).toEqual([{ width: 15, height: 30 }]);
    // Orientation 6: cm with a = 0, b = -height, c = width, d = 0.
    expect(await contentOf(bytes)).toMatch(/^0 -30 15 0 0 30 cm$/m);
  });

  it("keeps PNG transparency (soft mask)", async () => {
    const { bytes } = await imagesToPdf([input("t.png", halfTransparentPng())], FIT, fakeDecoder);
    const doc = await PDFDocument.load(bytes);
    const smasks = doc.context
      .enumerateIndirectObjects()
      .filter(
        ([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of("SMask")),
      );
    expect(smasks.length).toBe(1);
  });

  it("A4 with a margin places the image inside the bounds", async () => {
    const { bytes } = await imagesToPdf(
      [input("a.jpg", redBlueJpeg())],
      { pageSize: "a4", orientation: "auto", margin: "large" },
      fakeDecoder,
    );
    // Landscape image → landscape A4.
    expect(await pagesOf(bytes)).toEqual([{ width: 841.89, height: 595.28 }]);
    const [, , , , x, y] = (await contentOf(bytes))
      .match(/([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) cm/)!
      .slice(1)
      .map(Number);
    expect(x).toBeGreaterThanOrEqual(36 - 1e-6);
    expect(y).toBeGreaterThanOrEqual(36 - 1e-6);
  });

  it("re-encodes other formats with the decoder", async () => {
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    const { pageCount } = await imagesToPdf([input("x.webp", webp)], FIT, fakeDecoder);
    expect(pageCount).toBe(1);
  });

  it("explains unsupported, damaged and HEIC files", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    const error = await expectToolError(
      imagesToPdf([input("doc.jpg", pdf)], FIT, fakeDecoder),
      "E_UNSUPPORTED_FORMAT",
    );
    expect(error.message).toBe(
      "doc.jpg is a PDF document. JPG to PDF accepts JPG, PNG, WebP, GIF, BMP, AVIF and HEIC images.",
    );
    await expectToolError(
      imagesToPdf(
        [input("broken.jpg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))],
        FIT,
        fakeDecoder,
      ),
      "E_CORRUPT",
    );
    const heic = Uint8Array.from([
      0,
      0,
      0,
      24,
      ...new TextEncoder().encode("ftypheic"),
      0,
      0,
      0,
      0,
      ...new TextEncoder().encode("mif1heic"),
    ]);
    const heicError = await expectToolError(
      imagesToPdf([input("IMG_1.HEIC", heic)], FIT, failingDecoder),
      "E_UNSUPPORTED_FORMAT",
    );
    expect(heicError.message).toMatch(
      /^IMG_1\.HEIC is a HEIC photo, which this browser can’t open yet/,
    );
    await expectToolError(imagesToPdf([], FIT, fakeDecoder), "E_INVALID_INPUT");
  });
});
