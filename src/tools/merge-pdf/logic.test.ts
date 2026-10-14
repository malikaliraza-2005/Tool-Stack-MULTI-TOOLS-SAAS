import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { ToolError } from "@/lib/errors";
import {
  A4,
  LETTER,
  makeCorruptPdf,
  makeEncryptedPdf,
  makeJpegBytes,
  makePdf,
  toArrayBuffer,
} from "./__fixtures__/pdfs";
import { inspectPdf, mergePdfs, type PdfInput } from "./logic";

const input = async (name: string, sizes: [number, number][], rotation = 0): Promise<PdfInput> => ({
  name,
  bytes: toArrayBuffer(await makePdf(name, sizes, rotation)),
});

async function pageSizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => {
    const { width, height } = page.getSize();
    return [Math.round(width), Math.round(height)];
  });
}

async function expectToolError(promise: Promise<unknown>, code: string, fileName?: string) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ToolError);
  expect((error as ToolError).code).toBe(code);
  if (fileName) expect((error as ToolError).fileName).toBe(fileName);
  return error as ToolError;
}

describe("mergePdfs", () => {
  it("page count is the sum, in the chosen order (acceptance tests 1 and 2)", async () => {
    const a = await input("a.pdf", [
      [300, 300],
      [301, 301],
    ]);
    const b = await input("b.pdf", [[400, 400]]);
    const ab = await mergePdfs([a, b]);
    expect(ab.pageCount).toBe(3);
    expect(await pageSizes(ab.bytes)).toEqual([
      [300, 300],
      [301, 301],
      [400, 400],
    ]);

    const ba = await mergePdfs([
      await input("b.pdf", [[400, 400]]),
      await input("a.pdf", [
        [300, 300],
        [301, 301],
      ]),
    ]);
    expect(await pageSizes(ba.bytes)).toEqual([
      [400, 400],
      [300, 300],
      [301, 301],
    ]);
  });

  it("keeps mixed page sizes and rotation (acceptance test 5)", async () => {
    const result = await mergePdfs([
      await input("a4.pdf", [A4]),
      await input("letter.pdf", [LETTER], 90),
    ]);
    const doc = await PDFDocument.load(result.bytes);
    expect(await pageSizes(result.bytes)).toEqual([
      [595, 842],
      [612, 792],
    ]);
    expect(doc.getPage(0).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
  });

  it("rejects an encrypted file with E_ENCRYPTED naming it (acceptance test 3)", async () => {
    const encrypted = { name: "secret.pdf", bytes: toArrayBuffer(await makeEncryptedPdf()) };
    const error = await expectToolError(
      mergePdfs([await input("ok.pdf", [A4]), encrypted]),
      "E_ENCRYPTED",
      "secret.pdf",
    );
    expect(error.message).toBe(
      "secret.pdf is password-protected. Remove the password first, then try again.",
    );
    // Other files remain usable.
    const ok = await mergePdfs([await input("one.pdf", [A4]), await input("two.pdf", [A4])]);
    expect(ok.pageCount).toBe(2);
  });

  it("rejects a non-PDF renamed .pdf with E_UNSUPPORTED_FORMAT (acceptance test 4)", async () => {
    const fake = { name: "photo.pdf", bytes: toArrayBuffer(makeJpegBytes()) };
    const error = await expectToolError(
      mergePdfs([await input("ok.pdf", [A4]), fake]),
      "E_UNSUPPORTED_FORMAT",
      "photo.pdf",
    );
    expect(error.message).toBe("photo.pdf is a JPEG image. Merge PDF accepts PDF files.");
  });

  it("rejects a damaged PDF with E_CORRUPT", async () => {
    const broken = { name: "broken.pdf", bytes: toArrayBuffer(makeCorruptPdf()) };
    await expectToolError(inspectPdf(broken), "E_CORRUPT", "broken.pdf");
  });

  it("needs at least two files", async () => {
    await expectToolError(mergePdfs([await input("a.pdf", [A4])]), "E_INVALID_INPUT");
  });

  it("reports progress up to 1", async () => {
    const steps: number[] = [];
    await mergePdfs([await input("a.pdf", [A4]), await input("b.pdf", [A4])], (value) =>
      steps.push(value),
    );
    expect(steps[0]).toBe(0);
    expect(steps.at(-1)).toBe(1);
    expect([...steps].sort((x, y) => x - y)).toEqual(steps);
  });
});

describe("inspectPdf", () => {
  it("returns the page count", async () => {
    expect(await inspectPdf(await input("a.pdf", [A4, A4, LETTER]))).toEqual({ pageCount: 3 });
  });

  it("names unknown files without guessing a type", async () => {
    const text = { name: "notes.pdf", bytes: toArrayBuffer(new TextEncoder().encode("hello")) };
    const error = await expectToolError(inspectPdf(text), "E_UNSUPPORTED_FORMAT");
    expect(error.message).toBe("notes.pdf isn’t a supported file. Merge PDF accepts PDF files.");
  });
});
