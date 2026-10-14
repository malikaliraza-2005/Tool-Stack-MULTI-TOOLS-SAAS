import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import {
  A4,
  LETTER,
  makeEncryptedPdf,
  makeJpegBytes,
  makePdf,
} from "../../src/tools/merge-pdf/__fixtures__/pdfs";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Merge PDF end to end (tool-specifications §3.1). The noNetwork and csp
// fixtures run automatically: any request leaving the origin fails the test
// (acceptance test 6: no network requests during merge).

const pdfFile = async (name: string, sizes: [number, number][]) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from(await makePdf(name, sizes)),
});

async function addFiles(page: Page, files: Awaited<ReturnType<typeof pdfFile>>[]) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
}

async function pageSizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc
    .getPages()
    .map((p) => p.getSize())
    .map(({ width, height }) => [Math.round(width), Math.round(height)]);
}

const list = (page: Page) => page.getByRole("list", { name: "Files to merge, in order" });

test.describe("merge-pdf", () => {
  // pdf.js thumbnails and axe runs are slow in WebKit on CI-sized machines.
  test.beforeEach(({ browserName }) => test.slow(browserName === "webkit"));

  test("empty state is accessible in both themes", async ({ page }) => {
    await page.goto("/merge-pdf");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Merge PDF files");
    await expect(page.getByRole("button", { name: "Choose files" })).toBeVisible();
    await expect(page.getByText("0 bytes uploaded")).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expectNoA11yViolations(page);
    }
  });

  test("merges in the chosen order, reordered by keyboard, and downloads", async ({ page }) => {
    await page.goto("/merge-pdf");
    await addFiles(page, [await pdfFile("a.pdf", [A4, A4]), await pdfFile("b.pdf", [LETTER])]);

    const rows = list(page).getByRole("listitem");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("2 pages");
    await expect(rows.nth(1)).toContainText("1 page");
    await expectNoA11yViolations(page);

    // Keyboard reorder: move b.pdf up (acceptance test 2).
    const moveUp = page.getByRole("button", { name: "Move b.pdf up" });
    await moveUp.focus();
    await page.keyboard.press("Enter");
    await expect(rows.nth(0)).toContainText("b.pdf");
    await expect(
      page.getByRole("status").filter({ hasText: "b.pdf moved to position 1 of 2." }),
    ).toBeAttached();
    // Focus stays on a usable control of the moved file (Move up is now disabled).
    await expect(page.getByRole("button", { name: "Move b.pdf down" })).toBeFocused();

    await page.getByRole("button", { name: "Merge 2 PDFs" }).click();
    const heading = page.getByRole("heading", { name: "merged.pdf is ready" });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(page.getByRole("region", { name: "merged.pdf is ready" })).toContainText(
      "2 files → 1 PDF · 3 pages",
    );

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download merged PDF" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("merged.pdf");
    const bytes = await readFile((await download.path())!);
    // Acceptance tests 1, 2, 5: sum of pages, chosen order, mixed sizes kept.
    expect(await pageSizes(bytes)).toEqual([
      [612, 792],
      [595, 842],
      [595, 842],
    ]);
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expectNoA11yViolations(page);
    }
  });

  test("uses the edited file name", async ({ page }) => {
    await page.goto("/merge-pdf");
    await addFiles(page, [await pdfFile("a.pdf", [A4]), await pdfFile("b.pdf", [A4])]);
    await expect(page.getByRole("button", { name: "Merge 2 PDFs" })).not.toHaveAttribute(
      "aria-disabled",
    );
    await page.getByRole("textbox", { name: "File name" }).fill("Q3 report");
    await page.getByRole("button", { name: "Merge 2 PDFs" }).click();
    await expect(page.getByRole("heading", { name: "Q3 report.pdf is ready" })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download merged PDF" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("Q3 report.pdf");
  });

  test("reorders by dragging the handle", async ({ page, isMobile }) => {
    test.skip(isMobile, "Mouse drag; touch drag is checked manually");
    await page.goto("/merge-pdf");
    await addFiles(page, [await pdfFile("a.pdf", [A4]), await pdfFile("b.pdf", [A4])]);
    const rows = list(page).getByRole("listitem");
    await expect(rows.nth(1)).toContainText("1 page");

    const grip = rows.nth(0).locator("span.cursor-grab");
    const box = (await grip.boundingBox())!;
    const target = (await rows.nth(1).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 10; step++) {
      await page.mouse.move(box.x + box.width / 2, box.y + (target.height * 1.2 * step) / 10);
    }
    await page.mouse.up();
    await expect(rows.nth(0)).toContainText("b.pdf");
  });

  test("rejects encrypted and non-PDF files with their own reasons; others stay usable", async ({
    page,
  }) => {
    await page.goto("/merge-pdf");
    await addFiles(page, [
      await pdfFile("ok.pdf", [A4]),
      {
        name: "secret.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(await makeEncryptedPdf()),
      },
      { name: "photo.pdf", mimeType: "application/pdf", buffer: Buffer.from(makeJpegBytes()) },
    ]);
    // Acceptance tests 3 and 4.
    await expect(
      list(page).getByText(
        "secret.pdf is password-protected. Remove the password first, then try again.",
      ),
    ).toBeVisible();
    await expect(
      list(page).getByText("photo.pdf is a JPEG image. Merge PDF accepts PDF files."),
    ).toBeVisible();

    // Fewer than 2 valid files: Merge is disabled with a hint.
    const merge = page.getByRole("button", { name: "Merge PDFs" });
    await expect(merge).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("Add at least 2 PDF files to merge.")).toBeVisible();
    await expectNoA11yViolations(page);

    await addFiles(page, [await pdfFile("more.pdf", [A4])]);
    await expect(page.getByText("2 files with problems will be left out.")).toBeVisible();
    await page.getByRole("button", { name: "Merge 2 PDFs" }).click();
    await expect(page.getByText(/2 files → 1 PDF/)).toBeVisible();
  });

  test("remove and start over return focus to a sensible place", async ({ page }) => {
    await page.goto("/merge-pdf");
    await addFiles(page, [await pdfFile("a.pdf", [A4]), await pdfFile("b.pdf", [A4])]);
    await expect(list(page).getByRole("listitem")).toHaveCount(2);
    const remove = page.getByRole("button", { name: "Remove a.pdf" });
    await remove.focus();
    await page.keyboard.press("Enter");
    await expect(list(page).getByRole("listitem")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Remove b.pdf" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Choose files" })).toBeFocused();
  });
});
