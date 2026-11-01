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
} from "@/lib/pdf/__fixtures__/pdfs";
import { inspectPdf, planSplit, splitPdf, type PdfInput } from "./logic";

const input = async (name: string, sizes: [number, number][], rotation = 0): Promise<PdfInput> => ({
  name,
  bytes: toArrayBuffer(await makePdf(name.replace(".pdf", ""), sizes, rotation)),
});

/** The page labels ("report page 3") of an output, read back with pdf-lib. */
async function pageCountOf(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount();
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

const tenPages = Array.from({ length: 10 }, () => A4);

describe("planSplit", () => {
  it("extract: one file with the pages in the order typed", () => {
    expect(planSplit("report.pdf", 10, { mode: "extract", range: "1-3, 5" })).toEqual([
      { name: "report-pages-1-3_5.pdf", pages: [1, 2, 3, 5] },
    ]);
    expect(planSplit("report.pdf", 10, { mode: "extract", range: "8-" })[0]).toEqual({
      name: "report-pages-8-10.pdf",
      pages: [8, 9, 10],
    });
  });

  it("extract: a long page list falls back to a short name", () => {
    const range = Array.from({ length: 30 }, (_, i) => String(i * 2 + 1)).join(",");
    expect(planSplit("a.pdf", 100, { mode: "extract", range })[0]!.name).toBe("a-extract.pdf");
  });

  it("extract: an invalid range names the offending token", () => {
    expect(() => planSplit("a.pdf", 10, { mode: "extract", range: "1-3, 12" })).toThrow(
      "“12”: 12 is beyond the last page (10).",
    );
    try {
      planSplit("a.pdf", 10, { mode: "extract", range: "5-3" });
    } catch (error) {
      expect((error as ToolError).code).toBe("E_INVALID_INPUT");
    }
  });

  it("every N pages: parts, the last one shorter", () => {
    const parts = planSplit("scan.pdf", 7, { mode: "every", every: 3 });
    expect(parts).toEqual([
      { name: "scan-part-1.pdf", pages: [1, 2, 3] },
      { name: "scan-part-2.pdf", pages: [4, 5, 6] },
      { name: "scan-part-3.pdf", pages: [7] },
    ]);
    expect(planSplit("scan.pdf", 7, { mode: "every", every: 10 })).toHaveLength(1);
    expect(() => planSplit("scan.pdf", 7, { mode: "every", every: 0 })).toThrow(/whole number/);
    expect(() => planSplit("scan.pdf", 7, { mode: "every", every: 1.5 })).toThrow(/whole number/);
  });

  it("single pages: one file per page", () => {
    expect(planSplit("My Report.v2.pdf", 3, { mode: "single" }).map((p) => p.name)).toEqual([
      "My Report.v2-page-1.pdf",
      "My Report.v2-page-2.pdf",
      "My Report.v2-page-3.pdf",
    ]);
  });
});

describe("splitPdf", () => {
  it("each mode produces the expected page counts", async () => {
    const file = await input("report.pdf", tenPages);
    const extracted = await splitPdf(file, { mode: "extract", range: "2, 4-6" });
    expect(extracted).toHaveLength(1);
    expect(await pageCountOf(extracted[0]!.bytes)).toBe(4);

    const every = await splitPdf(await input("report.pdf", tenPages), { mode: "every", every: 4 });
    expect(every.map((o) => o.pageCount)).toEqual([4, 4, 2]);
    expect(await Promise.all(every.map((o) => pageCountOf(o.bytes)))).toEqual([4, 4, 2]);

    const single = await splitPdf(await input("report.pdf", tenPages), { mode: "single" });
    expect(single).toHaveLength(10);
    expect(single[6]!.name).toBe("report-page-7.pdf");
  });

  it("keeps page order, size and rotation", async () => {
    const file = await input("mixed.pdf", [A4, LETTER, A4], 90);
    const [output] = await splitPdf(file, { mode: "extract", range: "2, 1" });
    const doc = await PDFDocument.load(output!.bytes);
    const [first, second] = doc.getPages();
    expect(first!.getSize()).toEqual({ width: LETTER[0], height: LETTER[1] });
    expect(second!.getSize()).toEqual({ width: A4[0], height: A4[1] });
    expect(first!.getRotation().angle).toBe(90);
  });

  it("reports progress up to 1", async () => {
    const values: number[] = [];
    await splitPdf(await input("a.pdf", [A4, A4, A4]), { mode: "single" }, (value) =>
      values.push(value),
    );
    expect(values).toEqual([0, 1 / 3, 2 / 3, 1]);
  });

  it("maps encrypted, damaged and non-PDF files to tool errors", async () => {
    await expectToolError(
      splitPdf(
        { name: "locked.pdf", bytes: toArrayBuffer(await makeEncryptedPdf()) },
        { mode: "single" },
      ),
      "E_ENCRYPTED",
    );
    await expectToolError(
      inspectPdf({ name: "broken.pdf", bytes: toArrayBuffer(makeCorruptPdf()) }),
      "E_CORRUPT",
    );
    const error = await expectToolError(
      inspectPdf({ name: "photo.pdf", bytes: toArrayBuffer(makeJpegBytes()) }),
      "E_UNSUPPORTED_FORMAT",
    );
    expect(error.message).toBe("photo.pdf is a JPEG image. Split PDF accepts PDF files.");
  });

  it("inspect reports the page count", async () => {
    expect(await inspectPdf(await input("a.pdf", tenPages))).toEqual({ pageCount: 10 });
  });
});
