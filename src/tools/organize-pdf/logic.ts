// Organize PDF logic (tool-specifications §3.3). Runs in logic.worker.ts; no DOM.

import { degrees, PDFDocument } from "pdf-lib";
import { isOutOfMemory, toolErrors, ToolError } from "@/lib/errors";
import { loadPdf as loadAnyPdf, type PdfInput } from "@/lib/pdf/load";
import { meta } from "./meta";

export type { PdfInput } from "@/lib/pdf/load";

const loadPdf = (input: PdfInput) => loadAnyPdf(input, meta.name);

/** One output page: 0-based source page and the rotation added to it (degrees). */
export type PlannedPage = { source: number; rotation: number };

/** Validates the file when it is added, so problems show next to it right away. */
export async function inspectPdf(input: PdfInput): Promise<{ pageCount: number }> {
  const doc = await loadPdf(input);
  return { pageCount: doc.getPageCount() };
}

/**
 * Builds a new document from the edited page list: pages in the given order,
 * each rotated by its existing rotation plus the added one. A page may appear
 * once; deleted pages are simply absent.
 */
export async function organizePdf(
  input: PdfInput,
  plan: readonly PlannedPage[],
  onProgress?: (value: number, label: string) => void,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (plan.length === 0) {
    throw toolErrors.invalidInput("A PDF needs at least one page. Keep at least one page.");
  }
  const source = await loadPdf(input);
  const count = source.getPageCount();
  for (const page of plan) {
    if (!Number.isInteger(page.source) || page.source < 0 || page.source >= count) {
      throw toolErrors.unknown(
        "organizing the PDF",
        `Page ${page.source + 1} doesn't exist (${count} pages).`,
      );
    }
  }
  try {
    onProgress?.(0.1, "Copying pages");
    const output = await PDFDocument.create({ updateMetadata: false });
    let pages;
    try {
      pages = await output.copyPages(
        source,
        plan.map((page) => page.source),
      );
    } catch (error) {
      if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
      throw toolErrors.corrupt(input.name, error);
    }
    pages.forEach((page, i) => {
      const added = plan[i]!.rotation;
      if (added)
        page.setRotation(degrees((((page.getRotation().angle + added) % 360) + 360) % 360));
      output.addPage(page);
    });
    onProgress?.(0.6, "Saving the PDF");
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

export type OrganizeJob =
  { op: "inspect"; file: PdfInput } | { op: "organize"; file: PdfInput; plan: PlannedPage[] };

export type OrganizeJobResult =
  { op: "inspect"; pageCount: number } | { op: "organize"; bytes: ArrayBuffer; pageCount: number };
