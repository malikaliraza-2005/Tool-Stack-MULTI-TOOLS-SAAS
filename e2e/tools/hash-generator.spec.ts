import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Hash Generator end to end (tool-specifications §5.9). noNetwork and csp run
// automatically: text, files and the HMAC key never leave the origin.

const SAMPLE_SHA256 = "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592";
const SAMPLE_MD5 = "9e107d9d372bb6826bd81d3542a419d6";

const editor = (page: Page) => page.getByRole("textbox", { name: "Text to hash" });

/** The value of a result row, by its label. */
const row = (page: Page, label: string) =>
  page
    .getByRole("region", { name: "Hash Generator workspace" })
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

async function fill(page: Page, text: string) {
  await editor(page).focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  await editor(page).fill(text);
}

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/hash-generator");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("hash-generator", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Hash generator: SHA-256, MD5, SHA-1, SHA-512",
    );
    await expect(page.getByText("Nothing to show yet")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("hashes text with the selected algorithms and formats", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Sample", exact: true }).click();
    await expect(row(page, "SHA-256")).toHaveText(SAMPLE_SHA256);
    await page.getByRole("checkbox", { name: "MD5" }).click();
    await expect(row(page, "MD5")).toHaveText(SAMPLE_MD5);
    await expect(page.getByText(/MD5 and SHA-1 are not secure/)).toBeVisible();

    await page.getByRole("combobox", { name: "Output format" }).click();
    await page.getByRole("option", { name: "Base64" }).click();
    await expect(row(page, "SHA-256")).toHaveText(
      Buffer.from(SAMPLE_SHA256, "hex").toString("base64"),
    );
    // Content is never put in the URL (tool-specifications §2.3).
    expect(new URL(page.url()).search).toBe("");
    await bothThemesAccessible(page);
  });

  test("compares with an expected hash", async ({ page }) => {
    await open(page);
    await fill(page, "The quick brown fox jumps over the lazy dog");
    const expected = page.getByRole("textbox", { name: "Compare with expected hash" });
    await expected.fill(`  SHA256:${SAMPLE_SHA256.toUpperCase()} `);
    await expect(page.getByText("Matches SHA-256")).toBeVisible();
    await expect(row(page, "SHA-256")).toHaveText(SAMPLE_SHA256);
    await expect(
      page.locator("dl > div").filter({ hasText: "SHA-256" }).getByText("match", { exact: true }),
    ).toBeVisible();
    await expected.fill(SAMPLE_SHA256.replace(/^d/, "e"));
    await expect(page.getByText("No match", { exact: true })).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("computes HMAC-SHA256 (RFC 4231 test case 2)", async ({ page }) => {
    await open(page);
    await fill(page, "what do ya want for nothing?");
    await page.getByRole("switch", { name: "HMAC" }).click();
    await page.getByRole("textbox", { name: "HMAC key" }).fill("Jefe");
    await expect(row(page, "HMAC-SHA-256")).toHaveText(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
    await expect(page.getByRole("checkbox", { name: "MD5" })).toBeDisabled();
    await bothThemesAccessible(page);
  });

  test("hashes a file in the worker", async ({ page }) => {
    const bytes = Buffer.from(Array.from({ length: 3 * 2 ** 20 + 7 }, (_, i) => (i * 31) % 251));
    await open(page);
    await page.getByRole("checkbox", { name: "SHA-512" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "data.bin",
      mimeType: "application/octet-stream",
      buffer: bytes,
    });
    await expect(page.getByText("data.bin", { exact: true })).toBeVisible();
    await expect(row(page, "SHA-256")).toHaveText(createHash("sha256").update(bytes).digest("hex"));
    await expect(row(page, "SHA-512")).toHaveText(createHash("sha512").update(bytes).digest("hex"));
  });

  test("a 1 GB file is hashed in chunks", async ({ page, browserName, isMobile }, testInfo) => {
    test.skip(browserName !== "chromium" || isMobile, "Heavy; desktop Chromium only");
    test.setTimeout(240_000);
    // Written in 16 MB blocks, hashed in Node the same way for the expected value.
    const path = testInfo.outputPath("1gb.bin");
    const block = Buffer.from(Array.from({ length: 16 * 2 ** 20 }, (_, i) => (i * 7) % 256));
    const hash = createHash("sha256");
    const out = createWriteStream(path);
    for (let i = 0; i < 64; i++) {
      hash.update(block);
      if (!out.write(block))
        await new Promise<void>((resolve) => out.once("drain", () => resolve()));
    }
    await new Promise<void>((resolve) => out.end(() => resolve()));

    await open(page);
    await page.locator('input[type="file"]').setInputFiles(path);
    await expect(page.getByRole("progressbar", { name: "Hashing" })).toBeVisible();
    await expect(row(page, "SHA-256")).toHaveText(hash.digest("hex"), { timeout: 180_000 });
  });

  test("keyboard only: choose algorithms", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await fill(page, "abc");
    await page.getByRole("checkbox", { name: "SHA-1" }).focus();
    await page.keyboard.press("Space");
    await expect(row(page, "SHA-1")).toHaveText("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  test("remembers options, never content or the key", async ({ page }) => {
    await open(page);
    await fill(page, "value-that-must-not-be-stored");
    await page.getByRole("switch", { name: "HMAC" }).click();
    await page.getByRole("textbox", { name: "HMAC key" }).fill("key-that-must-not-be-stored");
    await expect(page.getByRole("switch", { name: "HMAC" })).toBeChecked();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:hash-generator");
    expect(stored).not.toContain("value-that-must-not-be-stored");
    expect(stored).not.toContain("key-that-must-not-be-stored");

    await page.reload();
    await expect(page.getByRole("switch", { name: "HMAC" })).toBeChecked();
    await expect(page.getByRole("textbox", { name: "HMAC key" })).toHaveValue("");
  });
});
