import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import {
  halfTransparentPng,
  redBlueJpeg,
  withExifOrientation,
} from "../../src/lib/files/__fixtures__/images";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// JPG to PDF end to end (tool-specifications §3.4). noNetwork and csp run
// automatically: images never leave the browser.

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/jpg-to-pdf");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

async function addImages(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
}

const jpg = (name: string, bytes = redBlueJpeg()) => ({
  name,
  mimeType: "image/jpeg",
  buffer: Buffer.from(bytes),
});
const png = (name: string) => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from(halfTransparentPng()),
});

const list = (page: Page) => page.getByRole("list", { name: "Images, one page each, in order" });

/** Page sizes of a downloaded PDF, rounded to points. */
async function pagesOf(download: Download) {
  const doc = await PDFDocument.load(await readFile((await download.path())!));
  return doc.getPages().map((p) => `${Math.round(p.getWidth())}×${Math.round(p.getHeight())}`);
}

async function convertAndDownload(page: Page) {
  await page.getByRole("button", { name: /^Convert/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  return download;
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("jpg-to-pdf", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("JPG and other images to PDF");
    await bothThemesAccessible(page);
  });

  test("one page per image, upright, fit to each image", async ({ page }) => {
    test.slow(); // Axe in both themes on two states.
    await open(page);
    await addImages(page, [
      jpg("wide.jpg"),
      jpg("phone.jpg", withExifOrientation(redBlueJpeg(), 6)),
      png("logo.png"),
    ]);
    // The phone photo is reported upright: 20 × 40, not 40 × 20.
    await expect(list(page).getByText(/40 × 20$/)).toBeVisible();
    await expect(list(page).getByText(/20 × 40$/)).toBeVisible();
    await expect(list(page).getByText(/16 × 16$/)).toBeVisible();
    await bothThemesAccessible(page);

    const download = await convertAndDownload(page);
    expect(download.suggestedFilename()).toBe("images.pdf");
    expect(await pagesOf(download)).toEqual(["30×15", "15×30", "12×12"]);
    await expect(page.getByText("3 images → 1 PDF")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("A4 with auto orientation and a margin", async ({ page }) => {
    await open(page);
    await addImages(page, [
      jpg("wide.jpg"),
      jpg("tall.jpg", withExifOrientation(redBlueJpeg(), 8)),
    ]);
    await expect(list(page).getByText(/20 × 40$/)).toBeVisible();
    await page.getByRole("combobox", { name: "Page size" }).click();
    await page.getByRole("option", { name: "A4" }).click();
    await page.getByRole("combobox", { name: "Margin" }).click();
    await page.getByRole("option", { name: "Large (36 pt)" }).click();
    expect(await pagesOf(await convertAndDownload(page))).toEqual(["842×595", "595×842"]);
  });

  test("a WebP image is converted", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "WebP is generated with Chromium's encoder");
    await open(page);
    const webp = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 30;
      canvas.height = 10;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#3366cc";
      context.fillRect(0, 0, 30, 10);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.9),
      );
      return Array.from(new Uint8Array(await blob!.arrayBuffer()));
    });
    await addImages(page, [
      { name: "banner.webp", mimeType: "image/webp", buffer: Buffer.from(webp) },
    ]);
    await expect(list(page).getByText(/30 × 10$/)).toBeVisible();
    const download = await convertAndDownload(page);
    expect(download.suggestedFilename()).toBe("banner.pdf");
    expect(await pagesOf(download)).toEqual(["23×8"]);
  });

  test("explains files it can't use", async ({ page, browserName }) => {
    test.slow(); // Axe in both themes after checking several files.
    await open(page);
    await addImages(page, [
      { name: "doc.jpg", mimeType: "image/jpeg", buffer: Buffer.from("%PDF-1.7\n") },
      jpg("ok.jpg"),
    ]);
    await expect(
      list(page).getByText(/doc\.jpg is a PDF document\. JPG to PDF accepts JPG, PNG/),
    ).toBeVisible();
    await expect(page.getByText("1 image with problems will be left out.")).toBeVisible();
    if (browserName === "chromium") {
      // Chromium can't decode HEIC: a clear message (full support ships in Phase 6).
      const heic = Buffer.from([
        0,
        0,
        0,
        24,
        ...Buffer.from("ftypheic"),
        0,
        0,
        0,
        0,
        ...Buffer.from("mif1heic"),
      ]);
      await addImages(page, [{ name: "IMG_0001.HEIC", mimeType: "image/heic", buffer: heic }]);
      await expect(list(page).getByText(/IMG_0001\.HEIC is a HEIC photo/)).toBeVisible();
    }
    await bothThemesAccessible(page);
  });

  test("keyboard only: reorder and convert", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await addImages(page, [jpg("first.jpg"), png("second.png")]);
    await expect(list(page).getByText(/16 × 16$/)).toBeVisible();
    await page.getByRole("button", { name: "Move second.png up" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Convert 2 images to PDF" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Download PDF" }).focus();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.keyboard.press("Enter"),
    ]);
    expect(await pagesOf(download)).toEqual(["12×12", "30×15"]);
  });

  test("remembers options, never the images", async ({ page }) => {
    await open(page);
    await addImages(page, [jpg("private-photo.jpg")]);
    await page.getByRole("combobox", { name: "Page size" }).click();
    await page.getByRole("option", { name: "Letter" }).click();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:jpg-to-pdf");
    expect(stored).not.toContain("private-photo");
    await page.reload();
    await addImages(page, [jpg("other.jpg")]);
    await expect(page.getByRole("combobox", { name: "Page size" })).toHaveText("Letter");
  });
});
