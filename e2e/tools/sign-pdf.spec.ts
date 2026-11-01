import { readFile } from "node:fs/promises";
import type { Download, Locator, Page } from "@playwright/test";
import { decodePDFRawStream, PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import {
  A4,
  makeEncryptedPdf,
  makeFormPdf,
  makeJpegBytes,
  makePdf,
  makeXfaPdf,
} from "../../src/lib/pdf/__fixtures__/pdfs";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Fill & Sign PDF end to end (tool-specifications §3.6). noNetwork and csp
// run automatically: the PDF and the signature never leave the browser.

const DISCLAIMER =
  "This adds a visual signature. It is not a certified digital signature. Check whether the recipient accepts electronic signatures.";

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/sign-pdf");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

async function choosePdf(page: Page, name: string, bytes: Uint8Array) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from(bytes) });
}

/** Waits until the file has been checked and its pages are shown. */
async function ready(page: Page, pages: number) {
  await expect(
    page.getByRole("list", { name: "PDF to sign" }).getByText(new RegExp(`· ${pages} pages?$`)),
  ).toBeVisible();
  await expect(page.locator("[data-page]")).toHaveCount(pages);
}

async function save(page: Page): Promise<Uint8Array> {
  await page.getByRole("button", { name: "Save signed PDF" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  return saved(download);
}

const saved = async (download: Download) =>
  new Uint8Array(await readFile((await download.path())!));

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

/** The item's position in view points, from its data-rect attribute. */
async function rectOf(item: Locator) {
  const [x, y, width, height] = (await item.getAttribute("data-rect"))!.split(" ").map(Number);
  return { x: x!, y: y!, width: width!, height: height! };
}

async function typeSignature(page: Page, name: string) {
  await page.getByRole("button", { name: "Add signature" }).click();
  const dialog = page.getByRole("dialog", { name: "Add your signature" });
  await dialog.getByRole("tab", { name: "Type" }).click();
  await dialog.getByRole("textbox", { name: "Your name" }).fill(name);
  await dialog.getByRole("button", { name: "Add signature" }).click();
  await expect(dialog).toBeHidden();
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("sign-pdf", () => {
  test("empty state shows the disclaimer and is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fill and sign a PDF");
    await expect(page.getByText(DISCLAIMER)).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("fills form fields and keeps them editable without flatten", async ({ page }) => {
    test.slow(); // Axe in both themes.
    await open(page);
    await choosePdf(page, "application.pdf", await makeFormPdf());
    await ready(page, 1);
    await expect(page.getByText(DISCLAIMER)).toBeVisible();
    await page.getByRole("textbox", { name: "Full name" }).fill("Ada Lovelace");
    await page.getByRole("checkbox", { name: "agree" }).click();
    await page.getByRole("radio", { name: "pro" }).click();
    await page.getByRole("combobox", { name: "country" }).click();
    await page.getByRole("option", { name: "France" }).click();
    await page.getByRole("switch", { name: /Flatten/ }).click();
    await bothThemesAccessible(page);

    const form = (await PDFDocument.load(await save(page))).getForm();
    expect(form.getTextField("full_name").getText()).toBe("Ada Lovelace");
    expect(form.getCheckBox("agree").isChecked()).toBe(true);
    expect(form.getRadioGroup("plan").getSelected()).toBe("pro");
    expect(form.getDropdown("country").getSelected()).toEqual(["France"]);
  });

  test("flattened output has no form fields", async ({ page }) => {
    await open(page);
    await choosePdf(page, "application.pdf", await makeFormPdf());
    await ready(page, 1);
    await page.getByRole("textbox", { name: "Full name" }).fill("Ada Lovelace");
    await expect(page.getByRole("switch", { name: /Flatten/ })).toBeChecked();
    const doc = await PDFDocument.load(await save(page));
    expect(doc.getForm().getFields()).toHaveLength(0);
    expect(page.getByText("application-signed.pdf is ready")).toBeTruthy();
  });

  test("places a typed signature on the chosen page, moved with the keyboard", async ({ page }) => {
    await open(page);
    await choosePdf(page, "contract.pdf", await makePdf("contract", [A4, A4]));
    await ready(page, 2);
    // New items go on the page in the middle of the screen.
    await page.locator('[data-page="1"]').scrollIntoViewIfNeeded();
    await page.locator('[data-page="1"]').evaluate((el) => el.scrollIntoView({ block: "center" }));
    await typeSignature(page, "Ada Lovelace");

    const signature = page.getByRole("button", { name: "Signature on page 2" });
    await expect(signature).toBeFocused();
    const item = page.locator('[data-item="signature"]');
    const before = await rectOf(item);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("ArrowDown");
    const after = await rectOf(item);
    expect(after.x).toBeCloseTo(before.x + 20, 1);
    expect(after.y).toBeCloseTo(before.y + 1, 1);
    await page.keyboard.press("+");
    expect((await rectOf(item)).width).toBeGreaterThan(after.width);
    const rect = await rectOf(item);

    const bytes = await save(page);
    expect(await contentOf(bytes, 0)).not.toMatch(/\/Image-\d+ Do/);
    const content = await contentOf(bytes, 1);
    expect(content).toMatch(/\/Image-\d+ Do/);
    // The first matrix in the image's q … Q block translates to its bottom-left corner.
    const block = content.slice(content.lastIndexOf("q\n", content.search(/\/Image-\d+ Do/)));
    const translate = block.match(/1 0 0 1 (-?[\d.]+) (-?[\d.]+) cm/)!;
    expect(Math.abs(Number(translate[1]) - rect.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(translate[2]) - (A4[1] - rect.y - rect.height))).toBeLessThanOrEqual(1);
  });

  test("draws a signature and drags it with the mouse", async ({ page, isMobile }) => {
    test.skip(isMobile, "Mouse drawing; touch is covered by real-device checks");
    await open(page);
    await choosePdf(page, "contract.pdf", await makePdf("contract"));
    await ready(page, 1);
    await page.getByRole("button", { name: "Add signature" }).click();
    const dialog = page.getByRole("dialog", { name: "Add your signature" });
    const pad = dialog
      .getByRole("img", { name: /Signature drawing area/ })
      .or(dialog.locator("canvas"));
    const box = (await pad.first().boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + 100);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(box.x + 30 + i * 20, box.y + 100 + (i % 2 ? -30 : 30), { steps: 3 });
    }
    await page.mouse.up();
    await dialog.getByRole("button", { name: "Add signature" }).click();
    await expect(dialog).toBeHidden();

    const item = page.locator('[data-item="signature"]');
    const before = await rectOf(item);
    const handle = (await item.getByRole("button", { name: "Signature on page 1" }).boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2 - 80, handle.y + handle.height / 2 + 60, {
      steps: 6,
    });
    await page.mouse.up();
    const after = await rectOf(item);
    expect(after.x).toBeLessThan(before.x - 20);
    expect(after.y).toBeGreaterThan(before.y + 20);
  });

  test("adds text, a date and a checkmark; non-Latin text still saves", async ({ page }) => {
    await open(page);
    await choosePdf(page, "letter.pdf", await makePdf("letter"));
    await ready(page, 1);
    await page.getByRole("button", { name: "Date", exact: true }).click();
    await page.getByRole("button", { name: "Checkmark", exact: true }).click();
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.getByRole("textbox", { name: "Text on page 1" }).fill("Привет, Ada");
    await expect(page.getByRole("button", { name: "Text “Привет, Ada” on page 1" })).toBeVisible();
    const content = await contentOf(await save(page));
    // The date is real text; the Cyrillic text is drawn as an image.
    expect(content).toMatch(/Tj/);
    expect(content).toMatch(/\/Image-\d+ Do/);
  });

  test("offers 12 typed signature styles, chosen with the keyboard", async ({ page }) => {
    await open(page);
    await choosePdf(page, "contract.pdf", await makePdf("contract"));
    await ready(page, 1);
    await page.getByRole("button", { name: "Add signature" }).click();
    const dialog = page.getByRole("dialog", { name: "Add your signature" });
    await dialog.getByRole("tab", { name: "Type" }).click();
    await dialog.getByRole("textbox", { name: "Your name" }).fill("Ada Lovelace");
    const styles = dialog.getByRole("radiogroup", { name: "Signature style" }).getByRole("radio");
    await expect(styles).toHaveCount(12);
    await styles.first().focus();
    await page.keyboard.press("ArrowDown");
    // Radix moves focus after the key is released; Space then selects.
    await expect(dialog.getByRole("radio", { name: "Great Vibes" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(dialog.getByRole("radio", { name: "Great Vibes" })).toBeChecked();
    await dialog.getByRole("radio", { name: "Yellowtail" }).click();
    await expect(dialog.getByRole("radio", { name: "Yellowtail" })).toBeChecked();
    await dialog.getByRole("button", { name: "Add signature" }).click();
    await expect(page.getByRole("button", { name: "Signature on page 1" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("XFA forms show the unsupported message", async ({ page }) => {
    await open(page);
    await choosePdf(page, "tax-form.pdf", await makeXfaPdf());
    await ready(page, 1);
    await expect(page.getByRole("note")).toContainText("This PDF uses an XFA form");
    await expect(page.getByRole("heading", { name: /Form fields/ })).toHaveCount(0);
  });

  test("explains encrypted and non-PDF files", async ({ page }) => {
    await open(page);
    await choosePdf(page, "locked.pdf", await makeEncryptedPdf());
    await expect(page.getByText(/locked\.pdf is password-protected/).first()).toBeVisible();
    await page.getByRole("button", { name: "Choose another" }).click();
    await choosePdf(page, "photo.pdf", makeJpegBytes());
    await expect(
      page.getByText("photo.pdf is a JPEG image. Fill & Sign PDF accepts PDF files.").first(),
    ).toBeVisible();
  });

  test("remembers the signature only after opting in, and deletes it", async ({ page }) => {
    await open(page);
    await choosePdf(page, "contract.pdf", await makePdf("contract"));
    await ready(page, 1);
    await typeSignature(page, "Ada Lovelace");
    const stored = () => page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(await stored()).not.toContain("sign-pdf:signature");
    expect(await stored()).not.toContain("Ada");

    await page.getByRole("button", { name: "Add signature" }).click();
    const dialog = page.getByRole("dialog", { name: "Add your signature" });
    await dialog.getByRole("tab", { name: "Type" }).click();
    await dialog.getByRole("textbox", { name: "Your name" }).fill("Ada Lovelace");
    await dialog.getByRole("checkbox", { name: "Remember my signature on this device" }).click();
    await dialog.getByRole("button", { name: "Add signature" }).click();
    await expect(dialog).toBeHidden();
    expect(await stored()).toContain("ts:v1:sign-pdf:signature");

    await page.reload();
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
    await choosePdf(page, "other.pdf", await makePdf("other"));
    await ready(page, 1);
    await page.getByRole("button", { name: "Add signature" }).click();
    await expect(dialog.getByRole("img", { name: "Your saved signature" })).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(dialog.getByRole("img", { name: "Your saved signature" })).toHaveCount(0);
    expect(await stored()).not.toContain("sign-pdf:signature");
  });
});
