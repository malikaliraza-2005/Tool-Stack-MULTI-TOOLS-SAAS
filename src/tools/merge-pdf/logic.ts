// Merge PDF logic (tool-specifications §3.1). Runs in logic.worker.ts; no DOM.

import { PDFDocument } from "pdf-lib";
import { toolErrors, ToolError, isOutOfMemory } from "@/lib/errors";
import { loadPdf as loadAnyPdf, type PdfInput } from "@/lib/pdf/load";
import { meta } from "./meta";

const loadPdf = (input: PdfInput) => loadAnyPdf(input, meta.name);

export type { PdfInput } from "@/lib/pdf/load";

/** Validates one file when it is added, so problems show next to it right away. */
export async function inspectPdf(input: PdfInput): Promise<{ pageCount: number }> {
  const doc = await loadPdf(input);
  return { pageCount: doc.getPageCount() };
}

export type MergeResult = { bytes: Uint8Array; pageCount: number };

/**
 * Copies every page of every input, in order, into a new document. Page size
 * and rotation are kept (copyPages copies the page dictionaries); outlines
 * and form fields are not guaranteed to survive (stated in the content).
 */
export async function mergePdfs(
  inputs: readonly PdfInput[],
  onProgress?: (value: number, label: string) => void,
): Promise<MergeResult> {
  if (inputs.length < 2) {
    throw toolErrors.invalidInput("Add at least 2 PDF files to merge.");
  }
  // Loading, copying each file, and saving are the measurable steps.
  const steps = inputs.length + 1;
  try {
    const output = await PDFDocument.create({ updateMetadata: false });
    for (const [index, input] of inputs.entries()) {
      onProgress?.(index / steps, `Adding ${input.name} (${index + 1} of ${inputs.length})`);
      const source = await loadPdf(input);
      let pages;
      try {
        pages = await output.copyPages(source, source.getPageIndices());
      } catch (error) {
        if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
        throw toolErrors.corrupt(input.name, error);
      }
      for (const page of pages) output.addPage(page);
    }
    onProgress?.(inputs.length / steps, "Saving the merged PDF");
    const bytes = await output.save();
    onProgress?.(1, "Done");
    return { bytes, pageCount: output.getPageCount() };
  } catch (error) {
    if (error instanceof ToolError) throw error;
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Worker protocol (logic.worker.ts)

export type MergeJob = { op: "inspect"; file: PdfInput } | { op: "merge"; files: PdfInput[] };

export type MergeJobResult =
  { op: "inspect"; pageCount: number } | { op: "merge"; bytes: ArrayBuffer; pageCount: number };
