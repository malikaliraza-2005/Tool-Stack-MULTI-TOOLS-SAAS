import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { makePng, redBlueJpeg, withExifOrientation } from "../../src/lib/files/__fixtures__/images";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Resize Image end to end (tool-specifications §4.3). noNetwork and csp run
// automatically: images never leave the browser.

async function open(page: Page) {
  await page.goto("/resize-image");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

type Fixture = { name: string; mimeType: string; buffer: Buffer };
const png = (name: string, width = 200, height = 100): Fixture => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from(makePng(width, height, (x, y) => [x % 256, y % 256, 120, 255])),
});

async function add(page: Page, files: Fixture[]) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await expect(page.getByText("Your images stay on this device.")).toBeVisible();
}

const saved = async (download: Download) =>
  new Uint8Array(await readFile((await download.path())!));

async function run(page: Page, button: RegExp, download: RegExp = /^Download image$/) {
  await page.getByRole("button", { name: button }).click();
  const [event] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: download }).click(),
  ]);
  return { bytes: await saved(event), name: event.suggestedFilename() };
}

/** Width × height from a PNG's IHDR chunk. */
function pngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  return `${view.getUint32(16)} × ${view.getUint32(20)}`;
}

async function select(page: Page, field: string, option: string) {
  await page.getByRole("combobox", { name: field }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

const list = (page: Page) => page.getByRole("list", { name: "Images" });

test.describe("resize-image", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resize and crop images");
    await bothThemesAccessible(page);
  });

  test("resizes to an exact width; the height follows the proportions", async ({ page }) => {
    test.slow(); // Axe in both themes on two states.
    await open(page);
    await add(page, [png("wide.png")]);
    const width = page.getByRole("textbox", { name: "Width (px)" });
    await width.fill("150");
    await expect(page.getByRole("textbox", { name: "Height (px)" })).toHaveValue("75");
    await expect(page.getByText("200 × 100 → 150 × 75")).toBeVisible();
    await bothThemesAccessible(page);
    const out = await run(page, /^Resize image$/);
    expect(out.name).toBe("wide-resized.png");
    expect(pngSize(out.bytes)).toBe("150 × 75");
    await expect(list(page)).toContainText("200 × 100 → 150 × 75");
    await bothThemesAccessible(page);
  });

  test("resizes by percentage", async ({ page }) => {
    await open(page);
    await add(page, [png("a.png")]);
    await page.getByRole("radio", { name: "Percentage" }).click();
    await page.getByRole("textbox", { name: "Percentage" }).fill("25");
    const out = await run(page, /^Resize image$/);
    expect(pngSize(out.bytes)).toBe("50 × 25");
  });

  test("doesn't enlarge unless allowed", async ({ page }) => {
    await open(page);
    await add(page, [png("small.png")]);
    await page.getByRole("textbox", { name: "Width (px)" }).fill("400");
    await expect(page.getByText("200 × 100 → 200 × 100 (not enlarged)")).toBeVisible();
    const kept = await run(page, /^Resize image$/);
    expect(pngSize(kept.bytes)).toBe("200 × 100");
    await page.getByRole("button", { name: "Start over" }).click();
    await add(page, [png("small.png")]);
    await page.getByRole("checkbox", { name: "Don’t enlarge" }).click();
    await page.getByRole("textbox", { name: "Width (px)" }).fill("400");
    const larger = await run(page, /^Resize image$/);
    expect(pngSize(larger.bytes)).toBe("400 × 200");
  });

  test("a square preset fills and crops each image of a batch", async ({ page }) => {
    await open(page);
    await add(page, [png("a.png", 200, 100), png("b.png", 90, 160)]);
    await page.getByRole("checkbox", { name: "Don’t enlarge" }).click();
    await select(page, "Preset", "1080 × 1080 square post");
    await expect(page.getByRole("radio", { name: "Fill and crop" })).toBeChecked();
    const zip = unzipSync((await run(page, /^Resize 2 images$/, /^Download all \(ZIP\)$/)).bytes);
    expect(Object.keys(zip).sort()).toEqual(["a-resized.png", "b-resized.png"]);
    for (const bytes of Object.values(zip)) expect(pngSize(bytes)).toBe("1080 × 1080");
  });

  test("crop: fixed aspect, keyboard-adjustable, orientation applied first", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    // Stored 40 × 20 with EXIF orientation 6: shown (and cropped) as 20 × 40.
    await add(page, [
      {
        name: "phone.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(withExifOrientation(redBlueJpeg(), 6)),
      },
    ]);
    await expect(list(page)).toContainText("20 × 40");
    await page.getByRole("radio", { name: "Crop" }).click();
    await select(page, "Aspect ratio", "1:1");
    await select(page, "Format", "PNG");
    const area = page.getByRole("group", { name: /^Crop area/ });
    await expect(area).toHaveAccessibleName("Crop area, 20 × 20 pixels at 0, 10");
    await area.focus();
    await page.keyboard.press("Shift+ArrowLeft"); // smaller (1% of the width)
    await page.keyboard.press("ArrowUp");
    await expect(area).toHaveAccessibleName(/^Crop area, (\d+) × \1 pixels/);
    // Back to the full width, at the top.
    await page.keyboard.press("Shift+Alt+ArrowRight");
    for (let i = 0; i < 3; i++) await page.keyboard.press("Alt+ArrowUp");
    await expect(area).toHaveAccessibleName("Crop area, 20 × 20 pixels at 0, 0");
    await bothThemesAccessible(page);
    const out = await run(page, /^Crop image$/);
    expect(out.name).toBe("phone-cropped.png");
    expect(pngSize(out.bytes)).toBe("20 × 20");
  });

  test("remembers the options, never the images", async ({ page }) => {
    await open(page);
    await add(page, [png("secret-map.png")]);
    await page.getByRole("radio", { name: "Percentage" }).click();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:resize-image");
    expect(stored).not.toContain("secret");
    await page.reload();
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
    await add(page, [png("other.png")]);
    await expect(page.getByRole("radio", { name: "Percentage" })).toBeChecked();
  });
});
