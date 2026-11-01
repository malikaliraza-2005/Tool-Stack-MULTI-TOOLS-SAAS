import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { unzipSync } from "fflate";
import {
  A4,
  LETTER,
  makeEncryptedPdf,
  makeJpegBytes,
  makePdf,
} from "../../src/lib/pdf/__fixtures__/pdfs";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// PDF to JPG end to end (tool-specifications §3.5). noNetwork and csp run
// automatically: the PDF never leaves the browser.

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/pdf-to-jpg");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

async function choosePdf(page: Page, name: string, bytes: Uint8Array) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from(bytes) });
}

/** Waits until the file has been opened: its page count shows ("1.5 KB · PDF · 3 pages"). */
async function ready(page: Page, pages: number) {
  await expect(
    page.getByRole("list", { name: "PDF to convert" }).getByText(new RegExp(`· ${pages} pages?$`)),
  ).toBeVisible();
}

const saved = async (download: Download) =>
  new Uint8Array(await readFile((await download.path())!));

type ImageInfo = { width: number; height: number; alpha: boolean };

/** Size and alpha from a JPEG's SOF segment (JPEG has no alpha channel). */
function jpegInfo(bytes: Uint8Array): ImageInfo {
  expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
  let offset = 2;
  while (offset < bytes.length) {
    const marker = bytes[offset + 1]!;
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (marker >= 0xc0 && marker <= 0xc2) {
      return {
        height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
        width: (bytes[offset + 7]! << 8) | bytes[offset + 8]!,
        alpha: bytes[offset + 9] === 4,
      };
    }
    offset += 2 + length;
  }
  throw new Error("No SOF segment");
}

/** Size and alpha from a PNG's IHDR chunk (colour types 4 and 6 carry alpha). */
function pngInfo(bytes: Uint8Array): ImageInfo {
  expect([...bytes.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    alpha: [4, 6].includes(bytes[25]!),
  };
}

/** Pixel size of a page at `dpi`, as the tool computes it. */
const pixels = ([width, height]: [number, number], dpi: number) => [
  Math.floor((width * dpi) / 72),
  Math.floor((height * dpi) / 72),
];

function expectSize(info: ImageInfo, [width, height]: number[]) {
  expect(Math.abs(info.width - width!)).toBeLessThanOrEqual(1);
  expect(Math.abs(info.height - height!)).toBeLessThanOrEqual(1);
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("pdf-to-jpg", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("PDF to JPG and PNG");
    await expect(page.getByText("Drop a PDF here")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("converts a one-page PDF to a JPG at the chosen DPI", async ({ page }) => {
    test.slow(); // Axe in both themes on two states.
    await open(page);
    await choosePdf(page, "letter.pdf", await makePdf("letter", [LETTER]));
    await ready(page, 1);
    await page.getByRole("radio", { name: "72 DPI" }).click();
    await bothThemesAccessible(page);

    await page.getByRole("button", { name: "Convert to JPG" }).click();
    await expect(page.getByText("letter-page-1.jpg is ready")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download image" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("letter-page-1.jpg");
    const info = jpegInfo(await saved(download));
    expectSize(info, pixels(LETTER, 72));
    expect(info.alpha).toBe(false);
    await bothThemesAccessible(page);
  });

  test("converts a page range to PNGs in a ZIP", async ({ page }) => {
    await open(page);
    await choosePdf(page, "deck.pdf", await makePdf("deck", [A4, LETTER, A4, A4, LETTER]));
    await ready(page, 5);
    await page.getByRole("radio", { name: "PNG" }).click();
    await page.getByRole("radio", { name: "Some pages" }).click();
    await page.getByRole("textbox", { name: "Page range" }).fill("2, 4-5");
    await page.getByRole("button", { name: "Convert 3 pages to PNG" }).click();
    await expect(page.getByText("3 images are ready")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download all (ZIP)" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("deck-images.zip");
    const files = unzipSync(await saved(download));
    expect(Object.keys(files).sort()).toEqual([
      "deck-page-2.png",
      "deck-page-4.png",
      "deck-page-5.png",
    ]);
    // 150 DPI is the default; each image keeps its own page's size.
    expectSize(pngInfo(files["deck-page-2.png"]!), pixels(LETTER, 150));
    expectSize(pngInfo(files["deck-page-4.png"]!), pixels(A4, 150));

    // Each image can also be downloaded on its own.
    const [single] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download deck-page-5.png" }).click(),
    ]);
    expectSize(pngInfo(await saved(single)), pixels(LETTER, 150));
  });

  test("names the offending part of an invalid range", async ({ page }) => {
    await open(page);
    await choosePdf(page, "report.pdf", await makePdf("report", [A4, A4, A4]));
    await ready(page, 3);
    await page.getByRole("radio", { name: "Some pages" }).click();
    const range = page.getByRole("textbox", { name: "Page range" });
    await range.fill("1, 7");
    await expect(range).toHaveAttribute("aria-invalid", "true");
    await expect(range).toHaveAccessibleDescription(/“7”: 7 is beyond the last page \(3\)\./);
    await expect(page.getByRole("button", { name: "Convert to JPG" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("reduces pages that exceed a phone's canvas limit", async ({ page, isMobile }) => {
    // A1 at 150 DPI is ~17.4 megapixels: over iOS Safari's 16.7 MP, fine on desktop.
    const A1: [number, number] = [1684, 2384];
    await open(page);
    await choosePdf(page, "poster.pdf", await makePdf("poster", [A1]));
    await ready(page, 1);
    await page.getByRole("button", { name: "Convert to JPG" }).click();
    await expect(page.getByText("poster-page-1.jpg is ready")).toBeVisible();
    const note = page.getByText(/1 page was reduced to fit this device’s limit/);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download image" }).click(),
    ]);
    const info = jpegInfo(await saved(download));
    if (isMobile) {
      await expect(note).toBeVisible();
      expect(info.width * info.height).toBeLessThanOrEqual(16_777_216);
      expect(info.width / info.height).toBeCloseTo(A1[0] / A1[1], 2);
    } else {
      await expect(note).toBeHidden();
      expectSize(info, pixels(A1, 150));
    }
  });

  test("explains encrypted and non-PDF files", async ({ page }) => {
    await open(page);
    await choosePdf(page, "locked.pdf", await makeEncryptedPdf());
    await expect(page.getByText(/locked\.pdf is password-protected/).first()).toBeVisible();
    await page.getByRole("button", { name: "Choose another" }).click();
    await choosePdf(page, "photo.pdf", makeJpegBytes());
    await expect(
      page.getByText("photo.pdf is a JPEG image. PDF to JPG accepts PDF files.").first(),
    ).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("keyboard only: choose PNG and convert", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await choosePdf(page, "deck.pdf", await makePdf("deck", [A4, A4]));
    await ready(page, 2);
    await page.getByRole("radio", { name: "JPG" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "PNG" })).toBeFocused();
    // Radix moves focus after the key is released; Space then selects.
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "PNG" })).toBeChecked();
    await page.getByRole("button", { name: "Convert 2 pages to PNG" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("2 images are ready")).toBeVisible();
  });

  test("remembers the options, never the file", async ({ page }) => {
    await open(page);
    await choosePdf(page, "secret-report.pdf", await makePdf("secret", [A4]));
    await ready(page, 1);
    await page.getByRole("radio", { name: "PNG" }).click();
    await page.getByRole("radio", { name: "300 DPI" }).click();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:pdf-to-jpg");
    expect(stored).not.toContain("secret");
    await page.reload();
    await choosePdf(page, "other.pdf", await makePdf("other", [A4]));
    await expect(page.getByRole("radio", { name: "PNG" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "300 DPI" })).toBeChecked();
  });
});
