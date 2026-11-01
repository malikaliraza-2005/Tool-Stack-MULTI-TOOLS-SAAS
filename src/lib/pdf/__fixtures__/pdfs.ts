// PDF fixtures generated with pdf-lib, shared by unit and E2E tests, so no
// binary files are committed. Each page carries a text label that tests can
// look for in the output.

import { degrees, PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";
import { redBlueJpeg } from "../../files/__fixtures__/images";

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

/**
 * An A4 AcroForm with one field of each kind: text "full_name" (tooltip
 * "Full name"), checkbox "agree", radio "plan" (basic/pro), dropdown
 * "country" (Canada/France/Japan). The text field is at x 100, y 700.
 */
export async function makeFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const form = doc.getForm();
  const name = form.createTextField("full_name");
  name.acroField.dict.set(PDFName.of("TU"), PDFString.of("Full name"));
  name.addToPage(page, { x: 100, y: 700, width: 250, height: 24 });
  form.createCheckBox("agree").addToPage(page, { x: 100, y: 650, width: 16, height: 16 });
  const plan = form.createRadioGroup("plan");
  plan.addOptionToPage("basic", page, { x: 100, y: 600, width: 16, height: 16 });
  plan.addOptionToPage("pro", page, { x: 160, y: 600, width: 16, height: 16 });
  const country = form.createDropdown("country");
  country.addOptions(["Canada", "France", "Japan"]);
  country.addToPage(page, { x: 100, y: 540, width: 150, height: 24 });
  return doc.save();
}

/** A form that also carries an XFA stream (LiveCycle), which isn't supported. */
export async function makeXfaPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await makeFormPdf());
  const xfa = doc.context.flateStream('<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"/>');
  doc.getForm().acroForm.dict.set(PDFName.of("XFA"), doc.context.register(xfa));
  // save() would call getForm(), which strips XFA.
  return doc.save({ updateFieldAppearances: false });
}

/** A "scanned" page: one full-page JPEG and no text. */
export async function makeScannedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const image = await doc.embedJpg(redBlueJpeg());
  page.drawImage(image, { x: 0, y: 0, width: A4[0], height: A4[1] });
  return doc.save();
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
