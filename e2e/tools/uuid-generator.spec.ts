import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// UUID Generator end to end (tool-specifications §5.8). noNetwork and csp run
// automatically: values are generated in the browser, nothing is requested.

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const V7_UPPER_PLAIN = /^[0-9A-F]{12}7[0-9A-F]{3}[89AB][0-9A-F]{15}$/;
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

const single = (page: Page) => page.getByTestId("generated-id");
const quantity = (page: Page) => page.getByRole("textbox", { name: "How many" });

/** The row value for a label in the Inspect results. */
const row = (page: Page, label: string) =>
  page
    .getByRole("region", { name: "UUID Generator workspace" })
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

async function chooseType(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: label }).click();
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("uuid-generator", () => {
  test("generates a v4 UUID on load and a new one on demand", async ({ page }) => {
    await page.goto("/uuid-generator");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("UUID generator (GUID)");
    await expect(single(page)).toHaveText(V4);
    const first = await single(page).textContent();
    await page.getByRole("button", { name: "Generate new" }).click();
    await expect(single(page)).not.toHaveText(first!);
    await expect(single(page)).toHaveText(V4);
    await bothThemesAccessible(page);
  });

  test("generates sorted v7 UUIDs in bulk, formatted, and downloads them", async ({ page }) => {
    await page.goto("/uuid-generator");
    await chooseType(page, "UUID v7 (time-ordered)");
    await quantity(page).fill("50");
    await page.getByRole("switch", { name: "Uppercase" }).click();
    await page.getByRole("switch", { name: "Hyphens" }).click();
    await expect(page.getByText("50 UUIDs", { exact: true })).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download uuids.txt" }).click(),
    ]);
    const lines = (await readFile((await download.path())!, "utf8")).trim().split("\n");
    expect(lines).toHaveLength(50);
    for (const line of lines) expect(line).toMatch(V7_UPPER_PLAIN);
    expect([...lines].sort()).toEqual(lines);
    expect(new Set(lines).size).toBe(50);
    await bothThemesAccessible(page);
  });

  test("ULIDs ignore the UUID format options", async ({ page }) => {
    await page.goto("/uuid-generator");
    await chooseType(page, "ULID");
    await expect(single(page)).toHaveText(ULID);
    await expect(page.getByRole("switch", { name: "Hyphens" })).toBeDisabled();
    await expect(page.getByRole("switch", { name: "Uppercase" })).toBeDisabled();
  });

  test("an invalid quantity is explained", async ({ page }) => {
    await page.goto("/uuid-generator");
    // The first value appears once the page runs; typing earlier is reset.
    await expect(single(page)).toHaveText(V4);
    await quantity(page).fill("5000");
    await expect(quantity(page)).toHaveAttribute("aria-invalid", "true");
    await expect(quantity(page)).toHaveAccessibleDescription(
      "Enter a whole number from 1 to 1,000.",
    );
    // The last valid quantity stays in use.
    await expect(single(page)).toHaveText(V4);
  });

  test("inspects a v7 UUID and explains invalid ones", async ({ page }) => {
    test.slow(); // Four axe scans: two states in both themes.
    await page.goto("/uuid-generator");
    const field = page.getByRole("textbox", { name: "UUID to inspect" });
    await field.fill("{017F22E2-79B0-7CC3-98C4-DC0C0C07398F}");
    await expect(row(page, "UUID")).toHaveText("017f22e2-79b0-7cc3-98c4-dc0c0c07398f");
    await expect(row(page, "Version")).toHaveText("Version 7 (Unix time, sortable)");
    await expect(row(page, "Created (UTC)")).toHaveText("2022-02-22T19:22:22.000Z");
    await bothThemesAccessible(page);

    await field.fill("919108f7-52d1-4320-9bac-f847db4148a");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(/This has 31 hex digits/);
    await bothThemesAccessible(page);
  });

  test("keyboard only: generate and inspect", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await page.goto("/uuid-generator");
    await expect(single(page)).toHaveText(V4);
    const first = await single(page).textContent();
    await page.getByRole("button", { name: "Generate new" }).focus();
    await page.keyboard.press("Enter");
    await expect(single(page)).not.toHaveText(first!);
    await page.getByRole("textbox", { name: "UUID to inspect" }).focus();
    await page.keyboard.type("c232ab00-9414-11ec-b3c8-9f6bdeced846");
    await expect(row(page, "Created (UTC)")).toHaveText("2022-02-22T19:22:22.000Z");
  });

  test("remembers options, never generated or pasted values", async ({ page }) => {
    await page.goto("/uuid-generator");
    await chooseType(page, "UUID v7 (time-ordered)");
    await quantity(page).fill("3");
    await page
      .getByRole("textbox", { name: "UUID to inspect" })
      .fill("919108f7-52d1-4320-9bac-f847db4148a8");
    await expect(page.getByText("3 UUIDs", { exact: true })).toBeVisible();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:uuid-generator");
    expect(stored).not.toContain("919108f7");
    expect(stored).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(stored).toContain('\\"kind\\":\\"v7\\"');

    await page.reload();
    await expect(page.getByRole("combobox", { name: "Type" })).toHaveText("UUID v7 (time-ordered)");
    await expect(quantity(page)).toHaveValue("3");
    await expect(page.getByRole("textbox", { name: "UUID to inspect" })).toHaveValue("");
  });
});
