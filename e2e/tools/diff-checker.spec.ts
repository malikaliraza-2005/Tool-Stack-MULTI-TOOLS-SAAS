import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { applyPatch } from "diff";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Diff Checker end to end (tool-specifications §5.5). noNetwork and csp run
// automatically: both texts stay in the browser.

const differences = (page: Page) =>
  page.getByRole("region", { name: /^Differences, line by line/ });

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/diff-checker");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

/** Loads text into a pane through its file input (fast and reliable for any size). */
async function load(page: Page, pane: "Original" | "Changed", text: string, name = "text.txt") {
  await page
    .getByRole("region", { name: pane, exact: true })
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType: "text/plain", buffer: Buffer.from(text) });
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("diff-checker", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Diff checker: compare text and files",
    );
    await expect(page.getByText(/Paste or open the original and the changed text/)).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("highlights changed lines and words; navigates changes", async ({ page }) => {
    test.slow(); // Axe scans of a long result in both themes.
    await open(page);
    await page.getByRole("button", { name: "Sample", exact: true }).click();
    await expect(page.getByText("2 changes")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Differences/ })).toContainText("+3 −4 lines");
    await expect(differences(page).locator("ins", { hasText: "Thursday" })).toBeVisible();
    await expect(differences(page).locator("del", { hasText: "Tuesday" })).toBeVisible();

    await differences(page).focus();
    await page.keyboard.press("n");
    await expect(page.getByText("Change 1 of 2")).toBeVisible();
    await page.keyboard.press("n");
    await expect(page.getByText("Change 2 of 2")).toBeVisible();
    await page.keyboard.press("p");
    await expect(page.getByText("Change 1 of 2")).toBeVisible();
    await page.getByRole("button", { name: "Previous change (P)" }).click();
    await expect(page.getByText("Change 2 of 2")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("the unified diff applies as a patch", async ({ page }) => {
    const original = "one\ntwo\nthree\nfour\nfive\n";
    const changed = "one\n2\nthree\nfour\nfive\nsix\n";
    await open(page);
    await load(page, "Original", original, "a.txt");
    await load(page, "Changed", changed, "b.txt");
    await expect(page.getByText("2 changes")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download changes.diff" }).click(),
    ]);
    const patch = await readFile((await download.path())!, "utf8");
    expect(patch).toContain("@@ -1,5 +1,6 @@");
    expect(applyPatch(original, patch)).toBe(changed);
  });

  test("ignores whitespace and case on request", async ({ page }) => {
    await open(page);
    await load(page, "Original", "Hello  World\n\tindented\n");
    await load(page, "Changed", "hello world\nindented\n");
    // Two neighbouring changed lines form one change.
    const summary = page.getByRole("heading", { name: /Differences/ });
    await expect(summary).toContainText("+2 −2 lines");
    await page.getByRole("switch", { name: "Ignore whitespace" }).click();
    await expect(summary).toContainText("+1 −1 lines");
    await page.getByRole("switch", { name: "Ignore case" }).click();
    await expect(
      page.getByText("The texts are identical when ignoring differences in whitespace and case."),
    ).toBeVisible();
  });

  test("inline view lists removals before additions", async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones always use the inline view");
    await open(page);
    await load(page, "Original", "a\nb\n");
    await load(page, "Changed", "A\nB\n");
    await page.getByRole("radio", { name: "Inline" }).click();
    const lines = differences(page).locator("del, ins");
    await expect(lines).toHaveCount(4);
    expect(await lines.evaluateAll((els) => els.map((el) => el.tagName))).toEqual([
      "DEL",
      "DEL",
      "INS",
      "INS",
    ]);
  });

  test("phones show the inline view", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone layout");
    await open(page);
    await expect(page.getByRole("radio", { name: "Inline" })).toBeHidden();
    await page.getByRole("button", { name: "Sample", exact: true }).click();
    await expect(page.getByText("2 changes")).toBeVisible();
  });

  test("50,000-line inputs stay responsive", async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== "chromium" || isMobile, "Heavy; desktop Chromium is enough");
    test.setTimeout(120_000);
    const original = Array.from(
      { length: 50_000 },
      (_, i) => `Line ${i}: some ordinary text\n`,
    ).join("");
    const changed = original
      .replace("Line 100: some", "Line 100: changed")
      .replace("Line 40000: some ordinary text\n", "");
    await open(page);
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
    await load(page, "Original", original);
    await load(page, "Changed", changed);
    await expect(page.getByText("2 changes")).toBeVisible({ timeout: 60_000 });
    await differences(page).focus();
    await page.keyboard.press("n");
    await page.keyboard.press("n");
    await expect(page.getByText("Change 2 of 2")).toBeVisible();
    const maxGap = await page.evaluate(() => {
      const w = window as Window & { __maxGap?: number; __stop?: boolean };
      w.__stop = true;
      return w.__maxGap ?? 0;
    });
    console.log(`50k lines: longest main-thread frame gap ${Math.round(maxGap)} ms`);
    // The diff runs in the worker and only visible rows render; what remains is
    // CodeMirror loading two 1.5 MB documents. Regression guard, not a budget.
    expect(maxGap).toBeLessThan(5_000);
  });

  test("remembers options, never content", async ({ page }) => {
    await open(page);
    await load(page, "Original", "value-that-must-not-be-stored\n");
    await page.getByRole("switch", { name: "Ignore case" }).click();
    await expect(page.getByRole("switch", { name: "Ignore case" })).toBeChecked();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:diff-checker");
    expect(stored).not.toContain("value-that-must-not-be-stored");
    await page.reload();
    await expect(page.getByRole("switch", { name: "Ignore case" })).toBeChecked();
  });
});
