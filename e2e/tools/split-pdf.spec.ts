import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { A4, makeEncryptedPdf, makeJpegBytes, makePdf } from "../../src/lib/pdf/__fixtures__/pdfs";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Split PDF end to end (tool-specifications §3.2). noNetwork and csp run
// automatically: the PDF never leaves the browser.

const TEN_PAGES = Array.from({ length: 10 }, () => A4);

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/split-pdf");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

async function choosePdf(page: Page, name: string, bytes: Uint8Array) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from(bytes) });
}

/** Waits until the file has been checked: its page count shows ("1.5 KB · PDF · 10 pages"). */
async function ready(page: Page, pages: number) {
  await expect(
    page.getByRole("list", { name: "PDF to split" }).getByText(new RegExp(`· ${pages} pages$`)),
  ).toBeVisible();
}

const saved = async (download: Download) => readFile((await download.path())!);
const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("split-pdf", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Split PDF and extract pages");
    await expect(page.getByText("Drop a PDF here")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("extracts a page range into one PDF", async ({ page }) => {
    test.slow(); // Axe in both themes on two states.
    await open(page);
    await choosePdf(page, "report.pdf", await makePdf("report", TEN_PAGES));
    await ready(page, 10);
    await page.getByRole("textbox", { name: "Pages" }).fill("2, 4-6");
    await expect(page.getByRole("button", { name: "Split PDF" })).toBeVisible();
    await bothThemesAccessible(page);

    await page.getByRole("button", { name: "Split PDF" }).click();
    await expect(page.getByText("report-pages-2_4-6.pdf is ready")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download PDF" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("report-pages-2_4-6.pdf");
    expect(await pageCount(await saved(download))).toBe(4);
    await bothThemesAccessible(page);
  });

  test("names the offending part of an invalid range", async ({ page }) => {
    await open(page);
    await choosePdf(page, "report.pdf", await makePdf("report", TEN_PAGES));
    await ready(page, 10);
    const pages = page.getByRole("textbox", { name: "Pages" });
    await pages.fill("1-3, 12");
    await expect(pages).toHaveAttribute("aria-invalid", "true");
    await expect(pages).toHaveAccessibleDescription(/“12”: 12 is beyond the last page \(10\)\./);
    await pages.fill("5-3");
    await expect(pages).toHaveAccessibleDescription(/“5-3” goes backwards/);
    await expect(page.getByRole("button", { name: "Split PDF" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("splits every N pages into a ZIP", async ({ page }) => {
    await open(page);
    await choosePdf(
      page,
      "scan.pdf",
      await makePdf(
        "scan",
        Array.from({ length: 7 }, () => A4),
      ),
    );
    await ready(page, 7);
    await page.getByRole("radio", { name: "Every N pages (several PDFs)" }).click();
    await page.getByRole("textbox", { name: "Pages per file" }).fill("3");
    await page.getByRole("button", { name: "Split into 3 PDFs" }).click();
    await expect(page.getByText("3 PDFs are ready")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download all (ZIP)" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("scan-split.zip");
    const files = unzipSync(new Uint8Array(await saved(download)));
    expect(Object.keys(files).sort()).toEqual([
      "scan-part-1.pdf",
      "scan-part-2.pdf",
      "scan-part-3.pdf",
    ]);
    expect(await pageCount(files["scan-part-3.pdf"]!)).toBe(1);

    // Each part can also be downloaded on its own.
    const [single] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download scan-part-2.pdf" }).click(),
    ]);
    expect(await pageCount(await saved(single))).toBe(3);
  });

  test("splits into single pages", async ({ page }) => {
    await open(page);
    await choosePdf(page, "deck.pdf", await makePdf("deck", [A4, A4, A4, A4]));
    await ready(page, 4);
    await page.getByRole("radio", { name: "Single pages (one PDF per page)" }).click();
    await page.getByRole("button", { name: "Split into 4 PDFs" }).click();
    await expect(page.getByRole("list", { name: "Split files" }).getByRole("listitem")).toHaveCount(
      4,
    );
    await expect(page.getByText("deck-page-4.pdf")).toBeVisible();
  });

  test("explains encrypted and non-PDF files", async ({ page }) => {
    await open(page);
    await choosePdf(page, "locked.pdf", await makeEncryptedPdf());
    await expect(page.getByText(/locked\.pdf is password-protected/).first()).toBeVisible();
    await page.getByRole("button", { name: "Choose another" }).click();
    await choosePdf(page, "photo.pdf", makeJpegBytes());
    await expect(
      page.getByText("photo.pdf is a JPEG image. Split PDF accepts PDF files.").first(),
    ).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("keyboard only: choose a mode and split", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await choosePdf(page, "deck.pdf", await makePdf("deck", [A4, A4]));
    await ready(page, 2);
    await page.getByRole("radio", { name: "Extract pages into one PDF" }).focus();
    // Radix moves focus after the key is released; Space then selects.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: "Every N pages (several PDFs)" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    const single = page.getByRole("radio", { name: "Single pages (one PDF per page)" });
    await expect(single).toBeFocused();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("radio", { name: "Single pages (one PDF per page)" }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Split into 2 PDFs" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("2 PDFs are ready")).toBeVisible();
  });

  test("remembers the mode, never the file", async ({ page }) => {
    await open(page);
    await choosePdf(page, "secret-report.pdf", await makePdf("secret", [A4, A4]));
    await ready(page, 2);
    await page.getByRole("radio", { name: "Single pages (one PDF per page)" }).click();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:split-pdf");
    expect(stored).not.toContain("secret");
    await page.reload();
    await choosePdf(page, "other.pdf", await makePdf("other", [A4, A4]));
    await expect(
      page.getByRole("radio", { name: "Single pages (one PDF per page)" }),
    ).toBeChecked();
  });
});
