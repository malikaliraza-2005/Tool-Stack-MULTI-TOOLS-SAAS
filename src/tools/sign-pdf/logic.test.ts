import { decodePDFRawStream, PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { ToolError } from "@/lib/errors";
import { halfTransparentPng } from "@/lib/files/__fixtures__/images";
import {
  A4,
  makeEncryptedPdf,
  makeFormPdf,
  makePdf,
  makeXfaPdf,
  toArrayBuffer,
} from "@/lib/pdf/__fixtures__/pdfs";
import { inspectPdf, signPdf, type SignOptions } from "./logic";

const input = (bytes: Uint8Array, name = "form.pdf") => ({ name, bytes: toArrayBuffer(bytes) });
const NONE: SignOptions = { fields: {}, items: [], flatten: false };

/** The page's content stream text (drawing operators). */
async function contentOf(bytes: Uint8Array, index = 0) {
  const doc = await PDFDocument.load(bytes);
  const contents = doc.context.lookup(doc.getPages()[index]!.node.get(PDFName.of("Contents")));
  const items = contents instanceof PDFArray ? contents.asArray() : [contents];
  return items
    .map((item) => doc.context.lookup(item))
    .filter((item): item is PDFRawStream => item instanceof PDFRawStream)
    .map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode()))
    .join("\n");
}

/** Numbers of every `a b c d e f cm` operator, in order. */
function matrices(content: string): number[][] {
  return [...content.matchAll(/((?:-?[\d.]+\s+){6})cm/g)].map((m) =>
    m[1]!.trim().split(/\s+/).map(Number),
  );
}

describe("inspectPdf", () => {
  it("lists each form field with its value, options and widget position", async () => {
    const info = await inspectPdf(input(await makeFormPdf()));
    expect(info.xfa).toBe(false);
    expect(info.pages).toEqual([{ x: 0, y: 0, width: A4[0], height: A4[1], rotation: 0 }]);
    const byName = Object.fromEntries(info.fields.map((field) => [field.name, field]));
    expect(byName.full_name).toMatchObject({ label: "Full name", kind: "text", value: "" });
    // pdf-lib widens the widget by half its 1 pt border.
    const [widget] = byName.full_name!.widgets;
    expect(widget!.page).toBe(0);
    expect(Math.abs(widget!.rect.x - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(widget!.rect.y - 700)).toBeLessThanOrEqual(1);
    expect(Math.abs(widget!.rect.width - 250)).toBeLessThanOrEqual(1);
    expect(byName.agree).toMatchObject({ kind: "checkbox", value: false });
    expect(byName.plan).toMatchObject({ kind: "radio", value: null, options: ["basic", "pro"] });
    expect(byName.plan!.widgets).toHaveLength(2);
    expect(byName.country).toMatchObject({
      kind: "dropdown",
      options: ["Canada", "France", "Japan"],
    });
  });

  it("reports XFA forms", async () => {
    expect((await inspectPdf(input(await makeXfaPdf()))).xfa).toBe(true);
  });

  it("reads page rotation", async () => {
    const info = await inspectPdf(input(await makePdf("turned", [A4], 90)));
    expect(info.pages[0]!.rotation).toBe(90);
    expect(info.fields).toEqual([]);
  });

  it("refuses password-protected files", async () => {
    const error = await inspectPdf(input(await makeEncryptedPdf(), "locked.pdf")).catch(
      (e: unknown) => e,
    );
    expect((error as ToolError).code).toBe("E_ENCRYPTED");
  });
});

describe("signPdf", () => {
  const values = { full_name: "Ada Lovelace", agree: true, plan: "pro", country: "France" };

  it("fills the fields and keeps them editable without flatten", async () => {
    const { bytes } = await signPdf(input(await makeFormPdf()), { ...NONE, fields: values });
    const form = (await PDFDocument.load(bytes)).getForm();
    expect(form.getTextField("full_name").getText()).toBe("Ada Lovelace");
    expect(form.getCheckBox("agree").isChecked()).toBe(true);
    expect(form.getRadioGroup("plan").getSelected()).toBe("pro");
    expect(form.getDropdown("country").getSelected()).toEqual(["France"]);
  });

  it("flattens: no fields remain, the values become page content", async () => {
    const { bytes } = await signPdf(input(await makeFormPdf()), {
      ...NONE,
      fields: values,
      flatten: true,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getForm().getFields()).toHaveLength(0);
    // Flattened widgets are drawn as form XObjects on the page.
    expect(await contentOf(bytes)).toMatch(/Do/);
  });

  it("explains text a form font can't show", async () => {
    const error = await signPdf(input(await makeFormPdf()), {
      ...NONE,
      fields: { full_name: "Ζωή" },
    }).catch((e: unknown) => e);
    expect((error as ToolError).code).toBe("E_INVALID_INPUT");
    expect((error as ToolError).message).toMatch(/“full_name”.*Ζ/);
  });

  it("places a signature at the chosen position (within 1 pt)", async () => {
    const rect = { x: 120, y: 600, width: 160, height: 40 };
    const { bytes } = await signPdf(input(await makePdf("contract", [A4, A4])), {
      ...NONE,
      items: [{ kind: "image", page: 1, rect, png: toArrayBuffer(halfTransparentPng()) }],
    });
    expect(await contentOf(bytes, 0)).not.toMatch(/Do/);
    const content = await contentOf(bytes, 1);
    expect(content).toMatch(/\/Image-\d+ Do/);
    const [translate, , scale] = matrices(content);
    // Bottom-left corner in user space: x, page height − (y + height).
    expect(translate![4]).toBeCloseTo(120, 0);
    expect(translate![5]).toBeCloseTo(A4[1] - 640, 0);
    expect(scale!.slice(0, 4)).toEqual([160, 0, 0, 40]);
  });

  it("rotates items with the page so they appear upright", async () => {
    const rect = { x: 50, y: 60, width: 100, height: 20 };
    const { bytes } = await signPdf(input(await makePdf("turned", [A4], 90)), {
      ...NONE,
      items: [{ kind: "image", page: 0, rect, png: toArrayBuffer(halfTransparentPng()) }],
    });
    const [translate, rotate] = matrices(await contentOf(bytes));
    // On a page turned 90°, the view's x runs along user y.
    expect(translate!.slice(4)).toEqual([80, 50]);
    expect(rotate![0]).toBeCloseTo(0, 9);
    expect(rotate![1]).toBeCloseTo(1, 9);
  });

  it("draws text and checkmarks as page content", async () => {
    const { bytes } = await signPdf(input(await makePdf("letter")), {
      ...NONE,
      items: [
        {
          kind: "text",
          page: 0,
          rect: { x: 72, y: 100, width: 80, height: 17.5 },
          text: "1 Nov 2026",
        },
        { kind: "check", page: 0, rect: { x: 72, y: 150, width: 16, height: 16 } },
      ],
    });
    const content = await contentOf(bytes);
    expect(content).toMatch(/<[0-9A-F]+> Tj/);
    expect(content).toMatch(/14 Tf/);
    // The checkmark is a stroked path.
    expect(content).toMatch(/\bS\b/);
  });

  it("removes XFA so viewers show the edited form", async () => {
    const { bytes } = await signPdf(input(await makeXfaPdf()), NONE);
    expect((await PDFDocument.load(bytes)).getForm().hasXFA()).toBe(false);
  });
});
