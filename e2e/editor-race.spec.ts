import { expect, test } from "./fixtures";

// Typing fast on a slow CPU must not lose or reorder text (P9): the editor's
// sync effect used to treat a one-keystroke-old value as an external change.

test.skip(({ browserName, isMobile }) => browserName !== "chromium" || isMobile, "CDP throttling");

test("fast typing on a slow CPU keeps every character in order", async ({ page }) => {
  await page.goto("/json-formatter");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
  const input = page.getByRole("textbox", { name: "JSON input" });
  await input.focus();
  await expect(page.locator(".cm-editor")).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const text = '{"alpha":[1,2,3],"beta":{"gamma":true,"delta":"text"},"epsilon":null}';
  await page.keyboard.type(text);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const typed = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[aria-label="JSON input"] .cm-line')]
        .map((line) => line.textContent)
        .join("\n"),
    );
  await expect.poll(typed).toBe(text);
  await expect(page.getByText("Valid JSON", { exact: true })).toBeVisible();
});
