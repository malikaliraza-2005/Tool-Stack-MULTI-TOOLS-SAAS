// PDF fixtures generated with pdf-lib, shared by unit and E2E tests, so no
// binary files are committed. Each page carries a text label that tests can
// look for in the output.

import { degrees, PDFDocument, PDFName, StandardFonts } from "pdf-lib";

export const A4: [number, number] = [595.28, 841.89];
export const LETTER: [number, number] = [612, 792];

/** A PDF with one page per size, each labelled "<label> page <n>". */
export async function makePdf(
  label: string,
  sizes: [number, number][] = [A4],
  rotation = 0,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(label);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  sizes.forEach(([width, height], i) => {
    const page = doc.addPage([width, height]);
    page.drawText(`${label} page ${i + 1}`, { x: 48, y: height - 72, size: 24, font });
    if (rotation) page.setRotation(degrees(rotation));
  });
  return doc.save();
}

/** A PDF whose trailer declares encryption; pdf-lib refuses to load it. */
export async function makeEncryptedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage(A4);
  doc.context.trailerInfo.Encrypt = doc.context.register(
    doc.context.obj({ Filter: PDFName.of("Standard"), V: 1, R: 2 }),
  );
  return doc.save({ useObjectStreams: false });
}

/** Starts like a PDF but is truncated garbage. */
export function makeCorruptPdf(): Uint8Array {
  return new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R");
}

/** A JPEG header: a non-PDF file that could be renamed `.pdf`. */
export function makeJpegBytes(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
}

/** Copies into a standalone ArrayBuffer (pdf-lib's output may be a view). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}
