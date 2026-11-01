// Sign PDF logic (tool-specifications §3.6). Runs in logic.worker.ts; no DOM.

import {
  degrees,
  PDFCheckBox,
  PDFDict,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFString,
  PDFTextField,
  rgb,
  StandardFonts,
  type PDFDocument,
  type PDFField,
  type PDFForm,
} from "pdf-lib";
import { isOutOfMemory, isToolError, toolErrors } from "@/lib/errors";
import { loadPdf as loadAnyPdf, type PdfInput } from "@/lib/pdf/load";
import { normalizeRotation, placement, toUser, type PageBox, type Rect } from "./geometry";
import { meta } from "./meta";
import {
  CHECK_PATH,
  CHECK_STROKE,
  CHECK_VIEWBOX,
  TEXT_BASELINE,
  TEXT_LINE_HEIGHT,
  unencodable,
} from "./text";

export type { PdfInput } from "@/lib/pdf/load";

const loadPdf = (input: PdfInput) => loadAnyPdf(input, meta.name);

export type FieldKind = "text" | "checkbox" | "radio" | "dropdown" | "other";

/** An AcroForm field as the page shows it. Widget rects are in user space. */
export type FormField = {
  name: string;
  /** The field's tooltip (/TU) when it has one, else its name. */
  label: string;
  kind: FieldKind;
  /** Text, checked state, or the selected option (null when none). */
  value: string | boolean | null;
  options?: string[];
  readOnly: boolean;
  multiline?: boolean;
  maxLength?: number;
  widgets: { page: number; rect: Rect }[];
};

export type PdfInfo = { pages: PageBox[]; fields: FormField[]; xfa: boolean };

/** Something placed on a page; `rect` is in view coordinates (see geometry.ts). */
export type SignItem =
  | { kind: "image"; page: number; rect: Rect; png: ArrayBuffer }
  | { kind: "text"; page: number; rect: Rect; text: string }
  | { kind: "check"; page: number; rect: Rect };

export type FieldValues = Record<string, string | boolean | null>;

export type SignOptions = { fields: FieldValues; items: SignItem[]; flatten: boolean };

export type SignJob =
  { op: "inspect"; file: PdfInput } | ({ op: "sign"; file: PdfInput } & SignOptions);
export type SignJobResult =
  { op: "inspect"; info: PdfInfo } | { op: "sign"; bytes: ArrayBuffer; pageCount: number };

function pageBoxes(doc: PDFDocument): PageBox[] {
  return doc.getPages().map((page) => {
    const { x, y, width, height } = page.getCropBox();
    return { x, y, width, height, rotation: normalizeRotation(page.getRotation().angle) };
  });
}

function fieldKind(field: PDFField): FieldKind {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown || field instanceof PDFOptionList) return "dropdown";
  return "other";
}

function fieldValue(field: PDFField): FormField["value"] {
  if (field instanceof PDFTextField) return field.getText() ?? "";
  if (field instanceof PDFCheckBox) return field.isChecked();
  if (field instanceof PDFRadioGroup) return field.getSelected() ?? null;
  if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
    return field.getSelected()[0] ?? null;
  }
  return null;
}

/** Lists the form fields with the page and position of each widget. */
function readFields(doc: PDFDocument, form: PDFForm): FormField[] {
  // Widgets are found through each page's /Annots (their /P entry is optional).
  const pageOf = new Map<string, number>();
  doc.getPages().forEach((page, index) => {
    for (const ref of page.node.Annots()?.asArray() ?? []) pageOf.set(ref.toString(), index);
  });
  return form.getFields().map((field) => {
    const kind = fieldKind(field);
    const tooltip = field.acroField.dict.lookupMaybe(PDFName.of("TU"), PDFString, PDFHexString);
    const widgets = field.acroField.getWidgets().flatMap((widget) => {
      const ref = doc.context.getObjectRef(widget.dict);
      const page = ref ? pageOf.get(ref.toString()) : undefined;
      if (page === undefined) return [];
      const r = widget.getRectangle();
      const rect = {
        x: Math.min(r.x, r.x + r.width),
        y: Math.min(r.y, r.y + r.height),
        width: Math.abs(r.width),
        height: Math.abs(r.height),
      };
      return [{ page, rect }];
    });
    const info: FormField = {
      name: field.getName(),
      label: tooltip?.decodeText().trim() || field.getName(),
      kind,
      value: fieldValue(field),
      readOnly: field.isReadOnly(),
      widgets,
    };
    if (field instanceof PDFTextField) {
      info.multiline = field.isMultiline();
      const max = field.getMaxLength();
      if (max !== undefined) info.maxLength = max;
    }
    if (field instanceof PDFRadioGroup || field instanceof PDFDropdown) {
      info.options = field.getOptions();
    }
    if (field instanceof PDFOptionList) info.options = field.getOptions();
    return info;
  });
}

/** Whether the AcroForm carries XFA. Checked before getForm(), which deletes it. */
function hasXfa(doc: PDFDocument): boolean {
  return Boolean(doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict)?.has(PDFName.of("XFA")));
}

/** Reads what the page needs: page boxes, form fields and whether it is an XFA form. */
export async function inspectPdf(input: PdfInput): Promise<PdfInfo> {
  const doc = await loadPdf(input);
  const pages = pageBoxes(doc);
  const xfa = hasXfa(doc);
  try {
    return { pages, fields: readFields(doc, doc.getForm()), xfa };
  } catch (error) {
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    // A broken form doesn't stop signing: the fields just aren't offered.
    return { pages, fields: [], xfa };
  }
}

function fill(form: PDFForm, values: FieldValues) {
  for (const [name, value] of Object.entries(values)) {
    const field = form.getFieldMaybe(name);
    if (!field || field.isReadOnly()) continue;
    const label = `“${name}”`;
    if (field instanceof PDFTextField) {
      const text = typeof value === "string" ? value : "";
      const bad = unencodable(text.replace(/\r?\n/g, ""));
      if (bad.length > 0) {
        throw toolErrors.invalidInput(
          `The field ${label} contains characters the PDF’s form font can’t show (${bad.slice(0, 5).join(" ")}). Leave them out, or place the text with Add text instead.`,
        );
      }
      const max = field.getMaxLength();
      field.setText(max === undefined ? text : text.slice(0, max));
    } else if (field instanceof PDFCheckBox) {
      if (value === true) field.check();
      else field.uncheck();
    } else if (field instanceof PDFRadioGroup) {
      if (typeof value === "string" && field.getOptions().includes(value)) field.select(value);
      else field.clear();
    } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      if (typeof value === "string" && field.getOptions().includes(value)) field.select(value);
      else field.clear();
    }
  }
}

/**
 * Fills the form, draws the placed items onto their pages and, when
 * `flatten` is on, turns the fields into page content. Placed items are
 * always page content.
 */
export async function signPdf(
  input: PdfInput,
  { fields, items, flatten }: SignOptions,
  onProgress?: (value: number, label: string) => void,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const doc = await loadPdf(input);
  const boxes = pageBoxes(doc);
  const pages = doc.getPages();
  try {
    onProgress?.(0.1, "Filling the form");
    // XFA forms aren't supported. getForm() removes the XFA, so viewers show
    // the regular PDF form and page content, which is what was edited here.
    const form = doc.getForm();
    fill(form, fields);

    onProgress?.(0.4, "Placing signatures and text");
    const font = items.some((item) => item.kind === "text")
      ? await doc.embedFont(StandardFonts.Helvetica)
      : null;
    for (const item of items) {
      const page = pages[item.page];
      const box = boxes[item.page];
      if (!page || !box) throw toolErrors.unknown("signing the PDF", `No page ${item.page + 1}.`);
      const rotate = degrees(box.rotation);
      if (item.kind === "image") {
        const image = await doc.embedPng(item.png);
        const at = placement(box, item.rect);
        page.drawImage(image, {
          x: at.x,
          y: at.y,
          width: item.rect.width,
          height: item.rect.height,
          rotate,
        });
      } else if (item.kind === "text") {
        const bad = unencodable(item.text);
        if (bad.length > 0) {
          throw toolErrors.unknown("signing the PDF", `Text can’t be encoded: ${bad.join(" ")}`);
        }
        const size = item.rect.height / TEXT_LINE_HEIGHT;
        const [x, y] = toUser(
          box,
          item.rect.x,
          item.rect.y + item.rect.height - TEXT_BASELINE * size,
        );
        page.drawText(item.text, { x, y, size, font: font!, rotate, color: rgb(0, 0, 0) });
      } else {
        const [x, y] = toUser(box, item.rect.x, item.rect.y);
        page.drawSvgPath(CHECK_PATH, {
          x,
          y,
          rotate,
          scale: item.rect.width / CHECK_VIEWBOX,
          borderColor: rgb(0, 0, 0),
          borderWidth: CHECK_STROKE,
        });
      }
    }

    onProgress?.(0.7, flatten ? "Flattening the form" : "Saving");
    if (flatten) form.flatten();
    const bytes = await doc.save({ updateFieldAppearances: !flatten });
    return { bytes, pageCount: pages.length };
  } catch (error) {
    if (isToolError(error)) throw error;
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw toolErrors.unknown(
      "signing the PDF",
      error instanceof Error ? error.message : undefined,
      error,
    );
  }
}
