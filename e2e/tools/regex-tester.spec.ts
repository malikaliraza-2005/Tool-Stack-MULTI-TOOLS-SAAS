import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Regex Tester end to end (tool-specifications §5.6). noNetwork and csp run
// automatically: the pattern and text never leave the browser.

const pattern = (page: Page) => page.getByRole("textbox", { name: "Regular expression" });
const textEditor = (page: Page) => page.getByRole("textbox", { name: "Test text" });
const status = (page: Page) =>
  page.getByRole("region", { name: /^(Matches|Result)$/ }).getByRole("status");

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/regex-tester");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

/** Replaces the test text; clearing first keeps Firefox's CodeMirror reliable. */
async function fillText(page: Page, text: string) {
  await textEditor(page).focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  const clear = page.getByRole("button", { name: "Clear test text" });
  if (await clear.isEnabled()) await clear.click();
  await textEditor(page).fill(text);
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("regex-tester", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Regex tester (JavaScript)");
    await expect(page.getByText("JavaScript (ECMAScript) regex flavor")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("highlights matches and lists named groups", async ({ page }) => {
    test.slow(); // Long page: axe in both themes.
    await open(page);
    await page.getByRole("button", { name: "Sample", exact: true }).click();
    await expect(status(page)).toHaveText("2 matches");
    const highlighted = page.getByLabel("Test text with matches highlighted");
    await expect(highlighted.locator("mark")).toHaveText([
      "ada@example.com",
      "grace.hopper@navy.mil",
    ]);
    const details = page.getByRole("list", { name: "Match details" });
    await expect(details.getByRole("listitem").first()).toContainText("1 (user):ada");
    await expect(details.getByRole("listitem").first()).toContainText("2 (domain):example.com");
    await expect(page.getByText("Capturing group 1, named “user”")).toBeVisible();
    // Content is never put in the URL.
    expect(new URL(page.url()).search).toBe("");
    await bothThemesAccessible(page);
  });

  test("replace previews named and numbered groups", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Sample", exact: true }).click();
    await page.getByRole("radio", { name: "Replace" }).click();
    await expect(page.getByRole("textbox", { name: "Replaced text" })).toContainText(
      "Contact ada at example.com or grace.hopper at navy.mil.",
    );
    await page.getByRole("textbox", { name: "Replacement" }).fill("<$2>");
    await expect(page.getByRole("textbox", { name: "Replaced text" })).toContainText(
      "Contact <example.com> or <navy.mil>.",
    );
  });

  test("explains an invalid pattern next to the field", async ({ page }) => {
    await open(page);
    await pattern(page).fill("(abc");
    await expect(pattern(page)).toHaveAttribute("aria-invalid", "true");
    await expect(pattern(page)).toHaveAccessibleDescription(/^Invalid pattern: /);
    await expect(status(page)).toHaveText("Invalid pattern");
    await bothThemesAccessible(page);
  });

  test("catastrophic backtracking times out while the page stays responsive", async ({ page }) => {
    await open(page);
    await fillText(page, `${"a".repeat(40)}!`);
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
    await pattern(page).fill("(a+)+$");
    const alert = page.getByRole("alert").filter({ hasText: "The pattern was stopped" });
    await expect(alert).toContainText(
      "This pattern took too long (possible catastrophic backtracking). Try making quantifiers more specific.",
    );
    const maxGap = await page.evaluate(() => {
      const w = window as Window & { __maxGap?: number; __stop?: boolean };
      w.__stop = true;
      return w.__maxGap ?? 0;
    });
    console.log(`(a+)+$: longest main-thread frame gap ${Math.round(maxGap)} ms`);
    // On the page, (a+)+$ on 40 characters would block for minutes; in the
    // worker it is stopped at 1 s. What remains is rendering the update:
    // 17 ms in Chromium, ~100 ms in WebKit locally, up to ~650 ms on CI
    // runners. Any gap under the 1 s timeout proves the page wasn't blocked.
    expect(maxGap).toBeLessThan(1000);

    // The next pattern runs in a fresh worker.
    await pattern(page).fill("a+");
    await expect(status(page)).toHaveText("1 match");
  });

  test("flags change the result", async ({ page }) => {
    await open(page);
    await fillText(page, "Cat cat CAT");
    await pattern(page).fill("cat");
    await expect(status(page)).toHaveText("1 match");
    await page.getByRole("checkbox", { name: /^i ignore case/ }).click();
    await expect(status(page)).toHaveText("3 matches");
    await page.getByRole("checkbox", { name: /^g global/ }).click();
    await expect(status(page)).toHaveText("3 matches (first only: turn on g for all)");
  });

  test("keyboard only: enter a pattern and toggle a flag", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await page.getByRole("button", { name: "Sample", exact: true }).focus();
    await page.keyboard.press("Enter");
    await pattern(page).focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("@\\w+");
    await expect(status(page)).toHaveText("3 matches");
    await page.getByRole("checkbox", { name: /^g global/ }).focus();
    await page.keyboard.press("Space");
    await expect(status(page)).toHaveText("3 matches (first only: turn on g for all)");
  });

  test("remembers flags, never the pattern or text", async ({ page }) => {
    await open(page);
    await pattern(page).fill("value-that-must-not-be-stored");
    await page.getByRole("checkbox", { name: /^m multiline/ }).click();
    await expect(page.getByRole("checkbox", { name: /^m multiline/ })).toBeChecked();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:regex-tester");
    expect(stored).not.toContain("value-that-must-not-be-stored");
    await page.reload();
    await expect(page.getByRole("checkbox", { name: /^m multiline/ })).toBeChecked();
    await expect(pattern(page)).toHaveValue("");
  });
});
