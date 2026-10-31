import { readFile, writeFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// JSON Formatter end to end (tool-specifications §5.1). noNetwork and csp run
// automatically: nothing typed or opened may leave the origin.

const input = (page: Page) => page.getByRole("textbox", { name: "JSON input" });
const output = (page: Page) => page.getByRole("textbox", { name: "Formatted JSON output" });

/** Replaces the editor content by typing into whichever editor is mounted. */
async function fill(page: Page, text: string) {
  // CodeMirror replaces the plain textarea on intent; focusing loads it (works
  // with mouse and touch), then the text replaces the final editor's content.
  await input(page).focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  await input(page).fill(text);
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("json-formatter", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await page.goto("/json-formatter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "JSON formatter, validator and viewer",
    );
    await expect(page.getByText("Nothing to show yet")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("formats live, keeps big numbers, and downloads", async ({ page }) => {
    await page.goto("/json-formatter");
    await fill(page, '{"b":[1,2],"id":12345678901234567890}');
    await expect(page.getByText("Valid JSON", { exact: true })).toBeVisible();
    await expect(output(page)).toContainText('"id": 12345678901234567890');
    await expect(page.getByText(/1 number is larger than 9,007,199,254,740,991/)).toBeVisible();
    await expect(page.getByText("$.id")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download formatted.json" }).click(),
    ]);
    expect(await readFile((await download.path())!, "utf8")).toBe(
      '{\n  "b": [\n    1,\n    2\n  ],\n  "id": 12345678901234567890\n}',
    );
    // Content is never put in the URL (tool-specifications §2.3).
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");
    await bothThemesAccessible(page);
  });

  test("focus carries over when the editor upgrades", async ({ page }) => {
    await page.goto("/json-formatter");
    await input(page).focus();
    await expect(page.locator(".cm-editor")).toBeVisible();
    await expect(input(page)).toBeFocused();
    await page.keyboard.type('{"typed":true}');
    await expect(output(page)).toContainText('"typed": true');
  });

  test("minify and sort keys", async ({ page }) => {
    await page.goto("/json-formatter");
    await fill(page, '{ "b": 1, "a": [ true, null ] }');
    await page.getByRole("radio", { name: "Minify" }).click();
    await page.getByRole("switch", { name: "Sort keys" }).click();
    await expect(output(page)).toHaveText('{"a":[true,null],"b":1}');
  });

  test("shows the exact error location and jumps to it", async ({ page }) => {
    await page.goto("/json-formatter");
    await fill(page, '{\n  "a": 1\n  "b": 2\n}');
    const alert = page.getByRole("alert").filter({ hasText: "Invalid JSON" });
    await expect(alert).toContainText("Line 2, column 9: Expected “,” after this value.");
    await expect(page.getByText("Invalid JSON: line 2, column 9")).toBeVisible();
    await page.getByRole("button", { name: "Go to error" }).click();
    await expect(input(page)).toBeFocused();
    await bothThemesAccessible(page);
  });

  test("JSONC is rejected in strict mode and accepted with Allow comments", async ({ page }) => {
    await page.goto("/json-formatter");
    await fill(page, '{\n  // note\n  "a": 1,\n}');
    await expect(
      page.getByRole("alert").filter({ hasText: "Comments aren’t allowed" }),
    ).toBeVisible();
    await page.getByRole("switch", { name: "Allow comments" }).click();
    await expect(output(page)).toContainText('"a": 1');
    await expect(output(page)).not.toContainText("note");
  });

  test("tree view: keyboard navigation and paths", async ({ page }) => {
    await page.goto("/json-formatter");
    await page.getByRole("button", { name: "Sample", exact: true }).click();
    await page.getByRole("radio", { name: "Tree" }).click();
    const tree = page.getByRole("tree", { name: "JSON tree" });
    await expect(tree.getByRole("treeitem").first()).toContainText("root");
    await tree.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("[data-active-path]")).toHaveText("$.id");
    await page.keyboard.press("End");
    await expect(page.locator("[data-active-path]")).toHaveText("$.trackingNumber");
    await page.getByRole("button", { name: "Expand all" }).click();
    await expect(tree.getByRole("treeitem", { name: /"sku"/ }).first()).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("remembers options, never content", async ({ page }) => {
    await page.goto("/json-formatter");
    await fill(page, '{"secret":"value-that-must-not-be-stored"}');
    await page.getByRole("switch", { name: "Sort keys" }).click();
    await expect(page.getByRole("switch", { name: "Sort keys" })).toBeChecked();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:json-formatter");
    expect(stored).not.toContain("value-that-must-not-be-stored");

    await page.reload();
    await expect(page.getByRole("switch", { name: "Sort keys" })).toBeChecked();
    await expect(input(page)).not.toContainText("secret");
  });

  test("a file over the hard limit is refused before reading", async ({ page }, testInfo) => {
    await page.goto("/json-formatter");
    // Playwright can't pass buffers over 50 MB; use a file.
    const path = testInfo.outputPath("huge.json");
    await writeFile(path, Buffer.alloc(51 * 2 ** 20, 32));
    await page.locator('input[type="file"]').setInputFiles(path);
    await expect(page.getByRole("alert").filter({ hasText: "huge.json is 51 MB." })).toBeVisible();
  });

  test("a 20 MB file formats in the worker without freezing the page", async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(
      browserName !== "chromium" || isMobile,
      "Heavy; desktop Chromium is enough for the budget check",
    );
    test.setTimeout(120_000);
    const record = JSON.stringify({ id: 1, name: "Record name", tags: ["a", "b"], score: 0.5 });
    const count = Math.ceil((20 * 2 ** 20) / (record.length + 1));
    const big = `[${Array.from({ length: count }, () => record).join(",")}]`;

    await page.goto("/json-formatter");
    // Load CodeMirror first, so the measurement includes the real editor.
    await input(page).focus();
    await expect(page.locator(".cm-editor")).toBeVisible();
    // Longest gap between animation frames while the file is processed.
    await page.evaluate(() => {
      const w = window as Window & { __maxGap?: number; __stop?: boolean };
      w.__maxGap = 0;
      let last = performance.now();
      const tick = (now: number) => {
        w.__maxGap = Math.max(w.__maxGap ?? 0, now - last);
        last = now;
        if (!w.__stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.locator('input[type="file"]').setInputFiles({
      name: "big.json",
      mimeType: "application/json",
      buffer: Buffer.from(big),
    });
    await expect(page.getByText(/^[\d,]+ lines · /)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/^Valid JSON/)).toBeVisible();
    const maxGap = await page.evaluate(() => {
      const w = window as Window & { __maxGap?: number; __stop?: boolean };
      w.__stop = true;
      return w.__maxGap ?? 0;
    });
    console.log(`20 MB JSON: longest main-thread frame gap ${Math.round(maxGap)} ms`);
    // Parsing and formatting run in the worker. What remains on the main
    // thread is CodeMirror building its documents for 20 MB of input and
    // ~30 MB of output (≈ 1.2 s measured on a desktop, 2026-10-14) plus this
    // test's own polling: 1.9–2.5 s in total when run alone, up to ~9 s when
    // other browsers run in parallel on the same machine. This is a
    // regression guard sized for that noise: before the fix it froze for 30–45 s.
    expect(maxGap).toBeLessThan(10_000);
  });
});
