import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { unzipSync } from "fflate";
import {
  gif,
  halfTransparentPng,
  heic,
  redBlueJpeg,
  tinyWebp,
} from "../../src/lib/files/__fixtures__/images";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Convert Image end to end (tool-specifications §4.2). noNetwork and csp run
// automatically: images never leave the browser, and libheif loads from our
// own origin (/vendor/, D-6).

async function open(page: Page) {
  await page.goto("/convert-image");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

type Fixture = { name: string; mimeType: string; buffer: Buffer };
const file = (name: string, bytes: Uint8Array, mimeType: string): Fixture => ({
  name,
  mimeType,
  buffer: Buffer.from(bytes),
});

async function add(page: Page, files: Fixture[]) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await expect(
    page.getByText(/Your images stay on this device\.|with problems will be left out/),
  ).toBeVisible();
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

async function convertTo(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Convert to" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

const magic = (bytes: Uint8Array) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP") return "webp";
  if (new TextDecoder().decode(bytes.subarray(4, 12)).startsWith("ftypavif")) return "avif";
  return "unknown";
};

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

const list = (page: Page) => page.getByRole("list", { name: "Images" });

test.describe("convert-image", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Convert images: HEIC, WebP, PNG and more",
    );
    await bothThemesAccessible(page);
  });

  test("HEIC to JPG in every browser (libheif from our origin)", async ({ page }) => {
    test.slow(); // libheif is 2 MB; axe in both themes.
    await open(page);
    await add(page, [file("IMG_0001.HEIC", heic(), "image/heic")]);
    await expect(list(page)).toContainText("HEIC · 64 × 64");
    await bothThemesAccessible(page);
    const out = await run(page, /^Convert image$/);
    expect(out.name).toBe("IMG_0001.jpg");
    expect(magic(out.bytes)).toBe("jpeg");
    await expect(list(page)).toContainText("HEIC → JPG");
    await bothThemesAccessible(page);
  });

  test("Auto keeps transparency as PNG; JPG fills it with the background", async ({ page }) => {
    await open(page);
    await add(page, [file("logo.png", halfTransparentPng(), "image/png")]);
    const auto = await run(page, /^Convert image$/);
    expect(auto.name).toBe("logo-converted.png");
    expect(magic(auto.bytes)).toBe("png");

    await page.getByRole("button", { name: "Start over" }).click();
    await add(page, [file("logo.png", halfTransparentPng(), "image/png")]);
    await convertTo(page, "JPG");
    const background = page.getByRole("combobox", { name: "Background for transparent areas" });
    await expect(background).toHaveText(/White/);
    await background.click();
    await page.getByRole("option", { name: "Black" }).click();
    const jpg = await run(page, /^Convert image$/);
    expect(jpg.name).toBe("logo.jpg");
    expect(magic(jpg.bytes)).toBe("jpeg");
    await expect(list(page)).toContainText("PNG → JPG · transparent areas filled");
  });

  test("converts a mixed batch to WebP, with a first-frame warning for GIFs", async ({ page }) => {
    await open(page);
    await add(page, [
      file("a.jpg", redBlueJpeg(), "image/jpeg"),
      file("b.webp", tinyWebp(), "image/webp"),
      file("anim.gif", gif(2), "image/gif"),
    ]);
    await expect(list(page).getByText("only the first frame is converted")).toBeVisible();
    await convertTo(page, "WebP");
    const zip = unzipSync((await run(page, /^Convert 3 images$/, /^Download all \(ZIP\)$/)).bytes);
    expect(Object.keys(zip).sort()).toEqual(["a.webp", "anim.webp", "b-converted.webp"]);
    for (const bytes of Object.values(zip)) expect(magic(bytes)).toBe("webp");
  });

  test("a damaged HEIC says it couldn't be opened", async ({ page }) => {
    await open(page);
    await add(page, [file("broken.heic", heic().slice(0, 400), "image/heic")]);
    await page.getByRole("button", { name: /^Convert image$/ }).click();
    await expect(
      list(page).getByText("broken.heic is a HEIC photo that couldn’t be opened.", {
        exact: false,
      }),
    ).toBeVisible();
  });

  test("links to the libheif license and source", async ({ page }) => {
    await open(page);
    await page.getByRole("link", { name: "licenses page" }).click();
    await expect(
      page.getByRole("heading", { name: "HEIC decoder: libheif (LGPL-3.0)" }),
    ).toBeVisible();
    for (const name of ["libheif 1.23.5", "libde265 1.0.15", "libheif (LGPL-3.0 and GPL-3.0)"]) {
      const href = await page.getByRole("link", { name, exact: true }).getAttribute("href");
      const response = await page.request.get(href!);
      expect(response.status(), href!).toBe(200);
    }
    await expectNoA11yViolations(page);
  });
});
