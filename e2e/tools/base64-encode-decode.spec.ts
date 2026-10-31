import { readFile, writeFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { SAMPLE_BASE64, SAMPLE_TEXT } from "../../src/tools/base64-encode-decode/constants";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Base64 Encode & Decode end to end (tool-specifications §5.3). noNetwork and
// csp run automatically: nothing typed or opened may leave the origin.

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]);

const textInput = (page: Page) => page.getByRole("textbox", { name: "Text to encode" });
const base64Input = (page: Page) => page.getByRole("textbox", { name: "Base64 to decode" });
const encodedOutput = (page: Page) => page.getByRole("textbox", { name: "Base64 output" });
const decodedOutput = (page: Page) => page.getByRole("textbox", { name: "Decoded text" });

/** Replaces the editor content by typing into whichever editor is mounted. */
async function fill(page: Page, editor: ReturnType<Page["getByRole"]>, text: string) {
  // CodeMirror replaces the plain textarea on intent; focusing loads it.
  await editor.focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  await editor.fill(text);
}

async function decodeMode(page: Page) {
  await page.getByRole("radio", { name: "Decode" }).click();
  await expect(base64Input(page)).toBeVisible();
}

const saved = async (download: Download) => readFile((await download.path())!);

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("base64-encode-decode", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await page.goto("/base64-encode-decode");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Base64 encode and decode");
    await expect(page.getByText("Nothing to show yet")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("encodes UTF-8 text, URL-safe and wrapped, and swaps back", async ({ page }) => {
    await page.goto("/base64-encode-decode");
    await fill(page, textInput(page), SAMPLE_TEXT);
    await expect(encodedOutput(page)).toHaveText(SAMPLE_BASE64);

    await page.getByRole("switch", { name: "URL-safe" }).click();
    await expect(encodedOutput(page)).toHaveText(
      SAMPLE_BASE64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    );
    await page.getByRole("switch", { name: "URL-safe" }).click();
    await page.getByRole("switch", { name: "Wrap at 76" }).click();
    await expect(encodedOutput(page).locator(".cm-line")).toHaveCount(2);

    await page.getByRole("button", { name: "Swap" }).click();
    await expect(page.getByRole("radio", { name: "Decode" })).toBeChecked();
    // The already-loaded editor is renamed for the new mode.
    await expect(base64Input(page)).toBeVisible();
    await expect(decodedOutput(page)).toHaveText(SAMPLE_TEXT);
    await expect(page.getByText("Valid Base64", { exact: true })).toBeVisible();
    // Content is never put in the URL (tool-specifications §2.3).
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");
    await bothThemesAccessible(page);
  });

  test("shows where invalid Base64 goes wrong and jumps there", async ({ page }) => {
    await page.goto("/base64-encode-decode");
    await decodeMode(page);
    await fill(page, base64Input(page), 'SGVsbG8s\nIHdv"cmxk');
    const alert = page.getByRole("alert").filter({ hasText: "Invalid Base64" });
    await expect(alert).toContainText(
      'Line 2, column 5: A double quote (") isn’t a Base64 character.',
    );
    await expect(page.getByText("Invalid Base64: line 2, column 5")).toBeVisible();
    await page.getByRole("button", { name: "Go to error" }).click();
    await expect(base64Input(page)).toBeFocused();
    await bothThemesAccessible(page);
  });

  test("decodes a data URL to a downloadable image", async ({ page }) => {
    await page.goto("/base64-encode-decode");
    await decodeMode(page);
    await fill(page, base64Input(page), `data:image/png;base64,${PNG.toString("base64")}`);
    await expect(page.getByText("This is a PNG image, 14 bytes")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download decoded.png" }).first().click(),
    ]);
    expect(download.suggestedFilename()).toBe("decoded.png");
    expect(await saved(download)).toEqual(PNG);
    await bothThemesAccessible(page);
  });

  test("a binary file round-trips byte for byte", async ({ page }) => {
    const bytes = Buffer.from(Array.from({ length: 50_000 }, (_, i) => (i * 7 + 3) % 256));
    await page.goto("/base64-encode-decode");
    await page.locator('input[type="file"]').setInputFiles({
      name: "blob.bin",
      mimeType: "application/octet-stream",
      buffer: bytes,
    });
    await expect(page.getByText("blob.bin", { exact: true })).toBeVisible();
    const [encoded] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download blob-base64.txt" }).click(),
    ]);
    const base64 = (await saved(encoded)).toString("utf8");
    expect(base64).toBe(bytes.toString("base64"));

    await page.getByRole("switch", { name: "Data URL" }).click();
    await expect(page.getByRole("switch", { name: "URL-safe" })).toBeDisabled();

    // Decode the saved text file back.
    await decodeMode(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: "blob-base64.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(base64),
    });
    await expect(page.getByText("This is binary data, 49 KB", { exact: true })).toBeVisible();
    const [decoded] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download blob-base64-decoded.bin" }).first().click(),
    ]);
    expect(await saved(decoded)).toEqual(bytes);
  });

  test("a PNG file encodes to a data URL", async ({ page }) => {
    await page.goto("/base64-encode-decode");
    await page.locator('input[type="file"]').setInputFiles({
      name: "dot.png",
      mimeType: "",
      buffer: PNG,
    });
    await page.getByRole("switch", { name: "Data URL" }).click();
    await expect(encodedOutput(page)).toHaveText(`data:image/png;base64,${PNG.toString("base64")}`);
  });

  test("keyboard only: switch mode and decode", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await page.goto("/base64-encode-decode");
    // Keys pressed before the app starts do nothing (see expectNoA11yViolations).
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
    await page.getByRole("radio", { name: "Encode" }).focus();
    await page.keyboard.press("ArrowRight");
    // Radix moves focus after the key is released; Space then selects.
    await expect(page.getByRole("radio", { name: "Decode" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Decode" })).toBeChecked();
    await base64Input(page).focus();
    await expect(page.locator(".cm-editor").first()).toBeVisible();
    // Focus carries over from the textarea to CodeMirror, so typing continues.
    await page.keyboard.type("SGk=");
    await expect(decodedOutput(page)).toHaveText("Hi");
  });

  test("remembers options, never content", async ({ page }) => {
    await page.goto("/base64-encode-decode");
    await fill(page, textInput(page), "value-that-must-not-be-stored");
    await page.getByRole("switch", { name: "URL-safe" }).click();
    await expect(page.getByRole("switch", { name: "URL-safe" })).toBeChecked();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:base64-encode-decode");
    expect(stored).not.toContain("value-that-must-not-be-stored");
    expect(stored).not.toContain("dmFsdWUtdGhhdC1tdXN0LW5vdC1iZS1zdG9yZWQ");

    await page.reload();
    await expect(page.getByRole("switch", { name: "URL-safe" })).toBeChecked();
    await expect(textInput(page)).not.toContainText("value-that");
  });

  test("a file over the hard limit is refused before reading", async ({ page }, testInfo) => {
    await page.goto("/base64-encode-decode");
    // Playwright can't pass buffers over 50 MB; use a file.
    const path = testInfo.outputPath("huge.bin");
    await writeFile(path, Buffer.alloc(51 * 2 ** 20));
    await page.locator('input[type="file"]').setInputFiles(path);
    await expect(page.getByRole("alert").filter({ hasText: "huge.bin is 51 MB." })).toBeVisible();
  });
});
