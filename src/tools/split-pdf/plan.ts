// Which pages go into which Split PDF output (tool-specifications §3.2).
// Light (no pdf-lib), so the page can validate ranges and preview the result
// as the user types; logic.ts builds the files in the worker.

import { toolErrors } from "@/lib/errors";
import { baseName, sanitizeFileName } from "@/lib/files/names";
import { formatPageList, parsePageRange } from "@/lib/pdf/page-range";

export type SplitMode = "extract" | "every" | "single";

export type SplitOptions =
  { mode: "extract"; range: string } | { mode: "every"; every: number } | { mode: "single" };

/** One output document: 1-based source pages, in output order. */
export type Part = { name: string; pages: number[] };

/** Longest page list kept in a file name; longer ones fall back to "extract". */
const NAME_LIST_LIMIT = 40;

/**
 * Which pages go into which output file, and their names
 * (`<name>-pages-1-3.pdf`, `<name>-part-2.pdf`, `<name>-page-7.pdf`).
 * Errors: E_INVALID_INPUT with the offending token for ranges.
 */
export function planSplit(fileName: string, pageCount: number, options: SplitOptions): Part[] {
  const base = sanitizeFileName(baseName(fileName)) || "document";
  if (options.mode === "extract") {
    const parsed = parsePageRange(options.range, pageCount);
    if (!parsed.ok) throw toolErrors.invalidInput(parsed.message);
    const list = formatPageList(parsed.pages).replace(/, /g, "_");
    const label = list.length <= NAME_LIST_LIMIT ? `pages-${list}` : "extract";
    return [{ name: `${base}-${label}.pdf`, pages: parsed.pages }];
  }
  if (options.mode === "every") {
    const size = options.every;
    if (!Number.isInteger(size) || size < 1) {
      throw toolErrors.invalidInput("Enter a whole number of pages per file, 1 or more.");
    }
    const parts: Part[] = [];
    for (let start = 1, index = 1; start <= pageCount; start += size, index++) {
      const pages = Array.from(
        { length: Math.min(size, pageCount - start + 1) },
        (_, i) => start + i,
      );
      parts.push({ name: `${base}-part-${index}.pdf`, pages });
    }
    return parts;
  }
  return Array.from({ length: pageCount }, (_, i) => ({
    name: `${base}-page-${i + 1}.pdf`,
    pages: [i + 1],
  }));
}
