import type { Page } from "@playwright/test";
import { SAMPLES } from "../../src/tools/url-encode-decode/constants";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// URL Encode & Decode end to end (tool-specifications §5.4). noNetwork and csp
// run automatically: nothing typed may leave the origin, and parsing a URL
// must never request it.

const input = (page: Page, name: string) => page.getByRole("textbox", { name });
const output = (page: Page, name: "Encoded output" | "Decoded output") =>
  page.getByRole("textbox", { name });

/** Replaces the editor content the way a person would: select all, then type. */
async function fill(page: Page, name: string, text: string) {
  await input(page, name).focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  // Replacing a multi-line CodeMirror document with locator.fill() can leave
  // it empty in Firefox; filling an empty one works everywhere.
  const clear = page.getByRole("button", { name: "Clear input" });
  if (await clear.isEnabled()) await clear.click();
  await input(page, name).fill(text);
  await expect(input(page, name)).toHaveText(text.replaceAll("\n", ""));
}

async function setMode(page: Page, mode: "Encode" | "Decode" | "Parse") {
  await page.getByRole("radio", { name: mode }).click();
  await expect(page.getByRole("radio", { name: mode })).toBeChecked();
}

/** The value of a part in Parse mode, by its label. */
const part = (page: Page, label: string) =>
  page
    .getByRole("region", { name: "URL Encode & Decode workspace" })
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("url-encode-decode", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await page.goto("/url-encode-decode");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("URL encode and decode");
    await expect(page.getByText("Nothing to show yet")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("encodes a component, a full URL and form data, and swaps back", async ({ page }) => {
    await page.goto("/url-encode-decode");
    await fill(page, "Text to encode", SAMPLES.encode);
    await expect(output(page, "Encoded output")).toHaveText(SAMPLES.decode);

    await page.getByRole("switch", { name: "Space as +" }).click();
    await expect(output(page, "Encoded output")).toContainText("Gr%C3%BC%C3%9Fe+%26+greetings");

    await page.getByRole("combobox", { name: "Encode as" }).click();
    await page.getByRole("option", { name: "Full URL" }).click();
    await expect(page.getByRole("switch", { name: "Space as +" })).toBeDisabled();
    await fill(page, "Text to encode", "https://example.com/a b?q=ü&x=1");
    await expect(output(page, "Encoded output")).toHaveText(
      "https://example.com/a%20b?q=%C3%BC&x=1",
    );

    await page.getByRole("button", { name: "Swap" }).click();
    await expect(page.getByRole("radio", { name: "Decode" })).toBeChecked();
    await expect(input(page, "Text to decode")).toBeVisible();
    await expect(output(page, "Decoded output")).toHaveText("https://example.com/a b?q=ü&x=1");
    // Content is never put in the URL (tool-specifications §2.3).
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");
    await bothThemesAccessible(page);
  });

  test("decodes with + as space, and locates malformed escapes", async ({ page }) => {
    await page.goto("/url-encode-decode");
    await setMode(page, "Decode");
    await fill(page, "Text to decode", "q=coffee+beans%2B");
    await expect(output(page, "Decoded output")).toHaveText("q=coffee+beans+");
    await page.getByRole("switch", { name: "+ as space" }).click();
    await expect(output(page, "Decoded output")).toHaveText("q=coffee beans+");

    await fill(page, "Text to decode", "price\n100% off");
    const alert = page.getByRole("alert").filter({ hasText: "can’t be decoded" });
    await expect(alert).toContainText("Line 2, column 4: “%” isn’t a valid escape");
    await page.getByRole("button", { name: "Go to error" }).click();
    await expect(input(page, "Text to decode")).toBeFocused();

    await fill(page, "Text to decode", "caf%E9");
    await expect(
      page.getByRole("alert").filter({ hasText: "“%E9” isn’t valid UTF-8" }),
    ).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("parses a URL into parts, without opening it", async ({ page }) => {
    await page.goto("/url-encode-decode");
    await setMode(page, "Parse");
    await fill(page, "URL to parse", SAMPLES.parse);
    await expect(page.getByText("Valid URL", { exact: true })).toBeVisible();
    await expect(part(page, "Scheme")).toHaveText("https:");
    await expect(part(page, "Username")).toHaveText("ada");
    // The password is masked on screen.
    await expect(part(page, "Password")).toHaveText("••••••••");
    await expect(part(page, "Host")).toHaveText("shop.example.com");
    await expect(part(page, "Port")).toHaveText("8443");
    await expect(part(page, "Path (decoded)")).toHaveText("/search/café");
    await expect(part(page, "Fragment")).toHaveText("results");

    const table = page.getByRole("table", { name: "Query parameters (4)" });
    await expect(table.getByRole("row")).toHaveCount(5);
    await expect(table.getByRole("row").nth(1)).toContainText("coffee beans");
    await expect(table.getByText("repeated")).toHaveCount(2);
    await bothThemesAccessible(page);
  });

  test("parses IPv6 hosts, default ports and international names", async ({ page }) => {
    await page.goto("/url-encode-decode");
    await setMode(page, "Parse");
    await fill(page, "URL to parse", "http://[2001:db8::1]/");
    await expect(part(page, "Host")).toHaveText("[2001:db8::1]");
    await expect(part(page, "Port")).toHaveText("80");

    await fill(page, "URL to parse", "https://münchen.de/");
    await expect(part(page, "Host")).toHaveText("xn--mnchen-3ya.de");
    await expect(part(page, "Host (Unicode)")).toHaveText("münchen.de");

    await fill(page, "URL to parse", "example.com/path");
    await expect(
      page.getByRole("alert").filter({ hasText: "This URL has no scheme" }),
    ).toBeVisible();
  });

  test("keyboard only: switch mode and type", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await page.goto("/url-encode-decode");
    // Keys pressed before the app starts do nothing (see expectNoA11yViolations).
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
    await page.getByRole("radio", { name: "Encode" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Decode" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Decode" })).toBeChecked();
    await input(page, "Text to decode").focus();
    await expect(page.locator(".cm-editor").first()).toBeVisible();
    await page.keyboard.type("a%20b");
    await expect(output(page, "Decoded output")).toHaveText("a b");
  });

  test("remembers options, never content", async ({ page }) => {
    await page.goto("/url-encode-decode");
    await fill(page, "Text to encode", "value-that-must-not-be-stored");
    await page.getByRole("switch", { name: "Space as +" }).click();
    await expect(page.getByRole("switch", { name: "Space as +" })).toBeChecked();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:url-encode-decode");
    expect(stored).not.toContain("value-that-must-not-be-stored");

    await page.reload();
    await expect(page.getByRole("switch", { name: "Space as +" })).toBeChecked();
    await expect(input(page, "Text to encode")).not.toContainText("value-that");
  });
});
