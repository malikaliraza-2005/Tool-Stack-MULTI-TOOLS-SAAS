// Split PDF logic (tool-specifications §3.2). Runs in logic.worker.ts; no DOM.

import { PDFDocument } from "pdf-lib";
import { isOutOfMemory, toolErrors, ToolError } from "@/lib/errors";
import { loadPdf as loadAnyPdf, type PdfInput } from "@/lib/pdf/load";
import { meta } from "./meta";
import { planSplit, type SplitOptions } from "./plan";

export type { PdfInput } from "@/lib/pdf/load";
export { planSplit, type Part, type SplitMode, type SplitOptions } from "./plan";

const loadPdf = (input: PdfInput) => loadAnyPdf(input, meta.name);

export type SplitOutput = { name: string; bytes: Uint8Array; pageCount: number };

/** Builds each planned part from the source; pages keep their size and rotation. */
export async function splitPdf(
  input: PdfInput,
  options: SplitOptions,
  onProgress?: (value: number, label: string) => void,
): Promise<SplitOutput[]> {
  const source = await loadPdf(input);
  const parts = planSplit(input.name, source.getPageCount(), options);
  const outputs: SplitOutput[] = [];
  try {
    for (const [index, part] of parts.entries()) {
      onProgress?.(index / parts.length, `Creating ${part.name} (${index + 1} of ${parts.length})`);
      const output = await PDFDocument.create({ updateMetadata: false });
      let pages;
      try {
        pages = await output.copyPages(
          source,
          part.pages.map((page) => page - 1),
        );
      } catch (error) {
        if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
        throw toolErrors.corrupt(input.name, error);
      }
      for (const page of pages) output.addPage(page);
      outputs.push({ name: part.name, bytes: await output.save(), pageCount: pages.length });
    }
  } catch (error) {
    if (error instanceof ToolError) throw error;
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw error;
  }
  onProgress?.(1, "Done");
  return outputs;
}

/** Validates the file when it is added, so problems show next to it right away. */
export async function inspectPdf(input: PdfInput): Promise<{ pageCount: number }> {
  const doc = await loadPdf(input);
  return { pageCount: doc.getPageCount() };
}

// ---------------------------------------------------------------------------
// Worker protocol (logic.worker.ts)

export type SplitJob =
  { op: "inspect"; file: PdfInput } | { op: "split"; file: PdfInput; options: SplitOptions };

export type SplitJobResult =
  | { op: "inspect"; pageCount: number }
  | { op: "split"; files: { name: string; bytes: ArrayBuffer; pageCount: number }[] };
