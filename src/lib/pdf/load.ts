// Loading PDFs with pdf-lib for the PDF tools (tool-specifications §3), with
// failures mapped to ToolErrors. Runs in the tools' workers; no DOM.

import { PDFDocument } from "pdf-lib";
import { isOutOfMemory, toolErrors } from "@/lib/errors";
import { describeKind, detectFileType } from "@/lib/files/sniff";

export type PdfInput = { name: string; bytes: ArrayBuffer };

/**
 * Checks the magic bytes, then loads the document with pdf-lib. `tool` names
 * the tool in the "accepts PDF files" message.
 */
export async function loadPdf(input: PdfInput, tool: string): Promise<PDFDocument> {
  const kind = detectFileType(
    new Uint8Array(input.bytes, 0, Math.min(input.bytes.byteLength, 1024)),
  );
  if (kind !== "pdf") {
    throw toolErrors.unsupportedFormat({
      name: input.name,
      detected: kind ? describeKind(kind) : undefined,
      tool,
      formats: "PDF files",
    });
  }
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (error) {
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    // pdf-lib's EncryptedPDFError loses its class in the ES5 build; match the message.
    if (error instanceof Error && /is encrypted/i.test(error.message)) {
      throw toolErrors.encrypted(input.name);
    }
    throw toolErrors.corrupt(input.name, error);
  }
  let pages: number;
  try {
    pages = doc.getPageCount();
  } catch (error) {
    throw toolErrors.corrupt(input.name, error);
  }
  // pdf-lib parses leniently: a damaged file can "load" without any pages.
  if (pages === 0) throw toolErrors.corrupt(input.name);
  return doc;
}

/** pdf-lib's output as a standalone ArrayBuffer, ready to transfer. */
export function toTransferable(bytes: Uint8Array): ArrayBuffer {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer);
}
