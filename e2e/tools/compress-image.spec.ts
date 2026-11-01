import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { gif, gpsJpeg, makePng } from "../../src/lib/files/__fixtures__/images";
import { findMetadata, hasMetadata } from "../../src/lib/image/metadata";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Compress Image end to end (tool-specifications §4.1). noNetwork and csp run
// automatically: images never leave the browser.

async function open(page: Page) {
  await page.goto("/compress-image");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

type Fixture = { name: string; mimeType: string; buffer: Buffer };
const file = (name: string, bytes: Uint8Array, mimeType: string): Fixture => ({
  name,
  mimeType,
  buffer: Buffer.from(bytes),
});

/** A photo-like PNG: smooth gradients that compress well as JPG or WebP. */
const photoPng = (size = 200) =>
  makePng(size, size, (x, y) => [
    128 + Math.round(100 * Math.sin(x / 9)),
    128 + Math.round(100 * Math.cos(y / 11)),
    (x * 3 + y * 2) % 256,
    255,
  ]);

async function add(page: Page, files: Fixture[]) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await expect(page.getByText("Your images stay on this device.")).toBeVisible();
}

const saved = async (download: Download) =>
  new Uint8Array(await readFile((await download.path())!));

async function download(page: Page, name: RegExp) {
  const [event] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name }).click(),
  ]);
  return { bytes: await saved(event), name: event.suggestedFilename() };
}

async function chooseFormat(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Format" }).click();
  await page.getByRole("option", { name: label }).click();
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

const list = (page: Page) => page.getByRole("list", { name: "Images" });

test.describe("compress-image", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compress images");
    await bothThemesAccessible(page);
  });

  test("compresses to JPG with a before/after slider and per-file saving", async ({ page }) => {
    test.slow(); // Axe in both themes on two states.
    await open(page);
    await add(page, [file("photo.png", photoPng(), "image/png")]);
    await chooseFormat(page, "JPG");
    await bothThemesAccessible(page);
    await page.getByRole("button", { name: "Compress image" }).click();
    await expect(
      page.getByRole("heading", { name: "photo-compressed.jpg is ready" }),
    ).toBeFocused();
    await expect(list(page)).toContainText(/→ .* \(−\d+%\)/);

    // The slider: keyboard moves the divider.
    const slider = page.getByRole("slider", { name: "Compare Original and Compressed" });
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", "49");
    await page.keyboard.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    await bothThemesAccessible(page);

    const output = await download(page, /^Download image$/);
    expect(output.name).toBe("photo-compressed.jpg");
    expect(Array.from(output.bytes.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]);
    expect(output.bytes.length).toBeLessThan(photoPng().length);
  });

  test("keeps the original when compressing again would make it larger", async ({ page }) => {
    await open(page);
    await add(page, [file("photo.png", photoPng(), "image/png")]);
    await chooseFormat(page, "JPG");
    await page.getByRole("slider", { name: "Quality" }).focus();
    await page.keyboard.press("Home"); // quality 0
    await page.getByRole("button", { name: "Compress image" }).click();
    const small = await download(page, /^Download image$/);

    await page.getByRole("button", { name: "Start over" }).click();
    await add(page, [file("small.jpg", small.bytes, "image/jpeg")]);
    await chooseFormat(page, "Same as input");
    await page.getByRole("slider", { name: "Quality" }).focus();
    await page.keyboard.press("End"); // quality 100
    await page.getByRole("button", { name: "Compress image" }).click();
    await expect(list(page)).toContainText("Already well optimized, original kept");
    const kept = await download(page, /^Download image$/);
    expect(kept.bytes.length).toBeLessThanOrEqual(small.bytes.length);
  });

  test("a batch downloads as a ZIP with totals; metadata is removed", async ({ page }) => {
    await open(page);
    await add(page, [
      file("a.png", photoPng(120), "image/png"),
      file("b.png", photoPng(160), "image/png"),
      file("c.jpg", gpsJpeg(), "image/jpeg"),
    ]);
    await chooseFormat(page, "WebP");
    await page.getByRole("button", { name: "Compress 3 images" }).click();
    await expect(page.getByRole("heading", { name: "3 images compressed" })).toBeVisible();
    await expect(page.getByText(/3 images · .* → .* · saved \d+%/)).toBeVisible();
    const zip = unzipSync((await download(page, /^Download all \(ZIP\)$/)).bytes);
    expect(Object.keys(zip).sort()).toEqual([
      "a-compressed.webp",
      "b-compressed.webp",
      "c-compressed.webp",
    ]);
    for (const bytes of Object.values(zip)) {
      expect(new TextDecoder().decode(bytes.subarray(8, 12))).toBe("WEBP");
      expect(hasMetadata(findMetadata(bytes, "webp"))).toBe(false);
    }
  });

  test("PNG output is lossless and hides the quality slider", async ({ page }) => {
    await open(page);
    await add(page, [file("logo.png", photoPng(64), "image/png")]);
    // Same as input: a PNG stays PNG, so there is no quality to set.
    await expect(page.getByRole("slider", { name: "Quality" })).toHaveCount(0);
    await chooseFormat(page, "JPG");
    await expect(page.getByRole("slider", { name: "Quality" })).toBeVisible();
    await chooseFormat(page, "PNG (lossless)");
    await expect(page.getByRole("slider", { name: "Quality" })).toHaveCount(0);
    await page.getByRole("button", { name: "Compress image" }).click();
    await expect(page.getByRole("heading", { name: /is ready$/ })).toBeVisible();
  });

  test("rejects other formats with their reason", async ({ page }) => {
    await open(page);
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([
        file("anim.gif", gif(), "image/gif"),
        file("ok.png", photoPng(32), "image/png"),
      ]);
    await expect(
      list(page).getByText(
        "anim.gif is a GIF image. Compress Image accepts JPG, PNG, WebP and AVIF images.",
      ),
    ).toBeVisible();
    await expect(page.getByText("1 image with problems will be left out.")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("a 40-megapixel photo compresses, compared through downscaled previews", async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(
      browserName !== "chromium" || isMobile,
      "Memory-heavy: one desktop browser is enough",
    );
    test.slow();
    await open(page);
    // 8000 × 5000 JPEG drawn in the browser (P6-T04 large fixture).
    const base64 = await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(8000, 5000);
      const context = canvas.getContext("2d")!;
      const gradient = context.createLinearGradient(0, 0, 8000, 5000);
      gradient.addColorStop(0, "#d2691e");
      gradient.addColorStop(1, "#4682b4");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 8000, 5000);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(text);
    });
    await add(page, [file("big.jpg", Buffer.from(base64, "base64"), "image/jpeg")]);
    await expect(list(page)).toContainText("8000 × 5000");
    await page.getByRole("button", { name: "Compress image" }).click();
    await expect(page.getByRole("heading", { name: "big-compressed.jpg is ready" })).toBeVisible({
      timeout: 90_000,
    });
    // Previews are PNGs no larger than 2048 px, not the 40 MP files.
    const sizes = await page
      .getByRole("figure")
      .locator("img")
      .evaluateAll((images) =>
        images.map((img) =>
          Math.max((img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight),
        ),
      );
    expect(sizes).toEqual([2048, 2048]);
  });

  test("remembers the options, never the images", async ({ page }) => {
    await open(page);
    await add(page, [file("secret-plan.png", photoPng(32), "image/png")]);
    await chooseFormat(page, "WebP");
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:compress-image");
    expect(stored).not.toContain("secret");
    await page.reload();
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
    await add(page, [file("other.png", photoPng(32), "image/png")]);
    await expect(page.getByRole("combobox", { name: "Format" })).toHaveText(/WebP/);
  });
});
