import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import exifr from "exifr";
import { unzipSync } from "fflate";
import {
  gif,
  gpsJpeg,
  metadataPng,
  metadataWebp,
  redBlueJpeg,
} from "../../src/lib/files/__fixtures__/images";
import {
  findMetadata,
  hasMetadata,
  jpegOrientation,
  jpegScanData,
} from "../../src/lib/image/metadata";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Remove EXIF Data end to end (tool-specifications §4.4). noNetwork and csp
// run automatically: photos never leave the browser.

async function open(page: Page) {
  await page.goto("/remove-exif-data");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

type Fixture = { name: string; mimeType: string; buffer: Buffer };
const file = (name: string, bytes: Uint8Array, mimeType = "image/jpeg"): Fixture => ({
  name,
  mimeType,
  buffer: Buffer.from(bytes),
});

async function addPhotos(page: Page, files: Fixture[]) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
}

const saved = async (download: Download) =>
  new Uint8Array(await readFile((await download.path())!));

const list = (page: Page) => page.getByRole("list", { name: "Photos to clean" });

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

async function removeAndDownload(page: Page, button = /^Remove metadata/) {
  await page.getByRole("button", { name: button }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /^Download (photo|all \(ZIP\))$/ }).click(),
  ]);
  return saved(download);
}

test.describe("remove-exif-data", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Remove EXIF data and location from photos",
    );
    await bothThemesAccessible(page);
  });

  test("shows the GPS location first, as text, then removes it losslessly", async ({ page }) => {
    test.slow(); // Axe in both themes on two states.
    await open(page);
    const input = gpsJpeg();
    await addPhotos(page, [file("IMG_1234.jpg", input)]);

    const location = page.getByRole("region", { name: "Location (GPS)" });
    await expect(location).toContainText("51.50736° N, 0.12775° W");
    await expect(page.getByRole("region", { name: "Camera & device" })).toContainText("Sprigphone");
    await expect(page.getByText("GPS location and", { exact: false })).toBeVisible();
    // Text only: no map or other images are loaded for the location.
    await expect(location.locator("img, iframe, canvas")).toHaveCount(0);
    await bothThemesAccessible(page);

    const output = await removeAndDownload(page);
    await expect(list(page)).toContainText("Removed: GPS location, camera details, dates");
    await expect(list(page)).toContainText("orientation kept");
    await bothThemesAccessible(page);

    // Re-read with exifr: no GPS, nothing but the orientation.
    expect(await exifr.gps(output)).toBeUndefined();
    expect(jpegOrientation(output)).toBe(6);
    // Pixel data unchanged: the scan data is byte-identical.
    expect(Buffer.from(jpegScanData(output)).equals(Buffer.from(jpegScanData(input)))).toBe(true);
  });

  test("cleans JPG, PNG and WebP together; the ZIP has clean files", async ({ page }) => {
    await open(page);
    await addPhotos(page, [
      file("a.jpg", gpsJpeg()),
      file("b.png", metadataPng(), "image/png"),
      file("c.webp", metadataWebp(), "image/webp"),
    ]);
    await expect(page.getByRole("button", { name: "Remove metadata from 3 photos" })).toBeVisible();
    const zip = unzipSync(await removeAndDownload(page));
    expect(Object.keys(zip).sort()).toEqual([
      "a-no-metadata.jpg",
      "b-no-metadata.png",
      "c-no-metadata.webp",
    ]);
    for (const [name, bytes] of Object.entries(zip)) {
      const kind = name.endsWith(".png") ? "png" : name.endsWith(".webp") ? "webp" : "jpeg";
      const blocks = findMetadata(bytes, kind);
      // The JPEG keeps only its orientation tag.
      if (kind === "jpeg") expect(blocks).toMatchObject({ xmp: false, iptc: false, comments: 0 });
      else expect(hasMetadata(blocks)).toBe(false);
      // exifr can't read WebP; findMetadata above covers it.
      if (kind !== "webp") expect(await exifr.gps(bytes)).toBeUndefined();
    }
    // The WebP container is still valid: RIFF size matches.
    const webp = zip["c-no-metadata.webp"]!;
    expect(new DataView(webp.buffer, webp.byteOffset).getUint32(4, true)).toBe(webp.length - 8);
  });

  test("Remove everything turns sideways photos upright and drops the orientation", async ({
    page,
  }) => {
    await open(page);
    await addPhotos(page, [file("sideways.jpg", gpsJpeg())]);
    await page.getByRole("radio", { name: "Everything, including orientation" }).click();
    const output = await removeAndDownload(page);
    expect(jpegOrientation(output)).toBe(1);
    expect(hasMetadata(findMetadata(output, "jpeg"))).toBe(false);
    // Stored 40 × 20 with orientation 6, so the upright output is 20 × 40 (SOF: height, width).
    const sof = Buffer.from(output).indexOf(Buffer.from([0xff, 0xc0]));
    const at = sof === -1 ? Buffer.from(output).indexOf(Buffer.from([0xff, 0xc2])) : sof;
    const view = new DataView(output.buffer, output.byteOffset);
    expect([view.getUint16(at + 7), view.getUint16(at + 5)]).toEqual([20, 40]);
  });

  test("a photo without metadata is reported and left unchanged", async ({ page }) => {
    await open(page);
    await addPhotos(page, [file("clean.jpg", redBlueJpeg())]);
    await expect(page.getByText("This photo has no metadata to remove.")).toBeVisible();
    const output = await removeAndDownload(page);
    expect(Buffer.from(output).equals(Buffer.from(redBlueJpeg()))).toBe(true);
    await expect(list(page)).toContainText("No metadata found: the file is unchanged");
  });

  test("rejects other formats and damaged files with their reason", async ({ page }) => {
    await open(page);
    await addPhotos(page, [
      file("anim.gif", gif(), "image/gif"),
      file("broken.jpg", redBlueJpeg().subarray(0, 60)),
      file("good.jpg", gpsJpeg()),
    ]);
    await expect(
      list(page).getByText(
        "anim.gif is a GIF image. Remove EXIF Data accepts JPG, PNG and WebP images.",
      ),
    ).toBeVisible();
    await expect(
      list(page).getByText("broken.jpg couldn’t be read.", { exact: false }),
    ).toBeVisible();
    // Only the valid photo counts, once every file is checked.
    await expect(page.getByRole("button", { name: "Remove metadata", exact: true })).toBeVisible();
    await expect(page.getByText("Your photos stay on this device.")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("keyboard only: choose the mode and remove", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await addPhotos(page, [file("a.jpg", gpsJpeg())]);
    await expect(page.getByRole("region", { name: "Location (GPS)" })).toBeVisible();
    await page.getByRole("radio", { name: /keep orientation/ }).focus();
    await page.keyboard.press("ArrowDown");
    const everything = page.getByRole("radio", { name: "Everything, including orientation" });
    await expect(everything).toBeFocused();
    await page.keyboard.press("Space");
    await expect(everything).toBeChecked();
    await page.getByRole("button", { name: "Remove metadata" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "a-no-metadata.jpg is ready" })).toBeFocused();
  });

  test("remembers the mode, never the photo", async ({ page }) => {
    await open(page);
    await addPhotos(page, [file("secret-beach.jpg", gpsJpeg())]);
    await page.getByRole("radio", { name: "Everything, including orientation" }).click();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:remove-exif-data");
    expect(stored).not.toMatch(/secret|51\.5|Sprig/);
    await page.reload();
    await addPhotos(page, [file("other.jpg", gpsJpeg())]);
    await expect(
      page.getByRole("radio", { name: "Everything, including orientation" }),
    ).toBeChecked();
  });
});
