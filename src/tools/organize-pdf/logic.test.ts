import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { ToolError } from "@/lib/errors";
import {
  A4,
  LETTER,
  makeCorruptPdf,
  makeEncryptedPdf,
  makePdf,
  toArrayBuffer,
} from "@/lib/pdf/__fixtures__/pdfs";
import {
  applyEdit,
  createPageEditor,
  outputPlan,
  type PageEditorState,
} from "@/lib/pdf/page-editor";
import { inspectPdf, organizePdf, type PdfInput } from "./logic";

const input = async (sizes: [number, number][], rotation = 0): Promise<PdfInput> => ({
  name: "doc.pdf",
  bytes: toArrayBuffer(await makePdf("doc", sizes, rotation)),
});

async function pagesOf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => ({
    width: Math.round(page.getWidth()),
    rotation: page.getRotation().angle,
  }));
}

async function expectToolError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ToolError);
  expect((error as ToolError).code).toBe(code);
}

describe("organizePdf", () => {
  it("reflects reorder, rotation and deletion in the output", async () => {
    // A4, Letter, A4: page widths tell them apart.
    let state: PageEditorState = createPageEditor(3);
    const edit = (change: Parameters<typeof applyEdit>[1]) => {
      const result = applyEdit(state, change);
      if ("error" in result) throw new Error(result.error);
      state = result.state;
    };
    edit({ type: "move", ids: ["p2"], to: 0 });
    edit({ type: "rotate", ids: ["p2"], by: 90 });
    edit({ type: "remove", ids: ["p3"] });
    const { bytes, pageCount } = await organizePdf(
      await input([A4, LETTER, A4]),
      outputPlan(state.pages),
    );
    expect(pageCount).toBe(2);
    expect(await pagesOf(bytes)).toEqual([
      { width: Math.round(LETTER[0]), rotation: 90 },
      { width: Math.round(A4[0]), rotation: 0 },
    ]);
  });

  it("adds to an existing rotation and normalizes it", async () => {
    const { bytes } = await organizePdf(await input([A4, A4], 270), [
      { source: 0, rotation: 90 },
      { source: 1, rotation: 270 },
    ]);
    expect((await pagesOf(bytes)).map((page) => page.rotation)).toEqual([0, 180]);
  });

  it("keeps a 300-page document's pages in the new order", async () => {
    const sizes = Array.from({ length: 300 }, () => A4);
    const plan = Array.from({ length: 300 }, (_, i) => ({ source: 299 - i, rotation: 0 }));
    const { pageCount } = await organizePdf(await input(sizes), plan);
    expect(pageCount).toBe(300);
  });

  it("refuses an empty page list and invalid pages", async () => {
    await expectToolError(organizePdf(await input([A4]), []), "E_INVALID_INPUT");
    await expectToolError(
      organizePdf(await input([A4]), [{ source: 3, rotation: 0 }]),
      "E_UNKNOWN",
    );
  });

  it("maps encrypted and damaged files to tool errors", async () => {
    await expectToolError(
      inspectPdf({ name: "locked.pdf", bytes: toArrayBuffer(await makeEncryptedPdf()) }),
      "E_ENCRYPTED",
    );
    await expectToolError(
      inspectPdf({ name: "broken.pdf", bytes: toArrayBuffer(makeCorruptPdf()) }),
      "E_CORRUPT",
    );
    expect(await inspectPdf(await input([A4, A4]))).toEqual({ pageCount: 2 });
  });
});
