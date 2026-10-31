import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Unix Timestamp Converter end to end (tool-specifications §5.7). noNetwork
// and csp run automatically: nothing typed may leave the origin. The browser
// zone is fixed, so "local" is predictable.

test.use({ timezoneId: "America/New_York" });

const timestampInput = (page: Page) => page.getByRole("textbox", { name: "Unix timestamp" });
const dateInput = (page: Page) => page.getByLabel(/^Date and time/);
const workspace = (page: Page) =>
  page.getByRole("region", { name: "Unix Timestamp Converter workspace" });
const results = (page: Page, title: string) =>
  workspace(page).getByRole("region", { name: title }).getByRole("definition");

/** The value shown for a result row, by its label. */
const row = (page: Page, label: string) =>
  workspace(page)
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");

async function chooseZone(page: Page, search: string, option: string) {
  await page.getByRole("combobox", { name: "Time zone" }).click();
  await page.getByPlaceholder("Search time zones…").fill(search);
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByPlaceholder("Search time zones…")).toBeHidden();
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("unix-timestamp-converter", () => {
  test("empty state, live clock and pause", async ({ page }) => {
    await page.goto("/unix-timestamp-converter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Unix timestamp converter (epoch converter)",
    );
    await expect(page.getByText("Enter a timestamp", { exact: true })).toBeVisible();
    await expect(page.getByText("Pick a date and time", { exact: true })).toBeVisible();

    const clock = page.getByTestId("clock");
    await expect(clock).toHaveText(/^\d{10}$/);
    const now = Math.floor(Date.now() / 1000);
    expect(Math.abs(Number(await clock.textContent()) - now)).toBeLessThan(5);
    // The ticking value must not be announced (§5.7).
    expect(await clock.evaluate((el) => el.closest("[aria-live], [role=status]"))).toBeNull();
    const first = await clock.textContent();
    await expect(clock).not.toHaveText(first!, { timeout: 3000 });

    await page.getByRole("button", { name: "Pause" }).click();
    const paused = await clock.textContent();
    await expect(page.getByText("Unix time (paused)")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(clock).toHaveText(paused!);
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(clock).not.toHaveText(paused!);
    await bothThemesAccessible(page);
  });

  test("timestamp to date in UTC, local and a chosen zone", async ({ page }) => {
    await page.goto("/unix-timestamp-converter");
    await timestampInput(page).fill("1700000000");
    await expect(page.getByText("Read as seconds (10 digits).")).toBeVisible();
    await expect(row(page, "UTC (ISO 8601)")).toHaveText("2023-11-14T22:13:20.000Z");
    await expect(row(page, "Local: America/New York")).toHaveText("2023-11-14T17:13:20.000-05:00");
    await expect(row(page, "RFC 2822")).toHaveText("Tue, 14 Nov 2023 17:13:20 -0500");
    await expect(row(page, "Day of the week (America/New York)")).toHaveText("Tuesday");
    await expect(row(page, "Relative")).toHaveText(/ years? ago$/);

    await chooseZone(page, "Berlin", "Europe/Berlin");
    await expect(row(page, "Europe/Berlin")).toHaveText("2023-11-14T23:13:20.000+01:00");
    await expect(row(page, "RFC 2822")).toHaveText("Tue, 14 Nov 2023 23:13:20 +0100");
    await expect(results(page, "Timestamp to date")).toHaveCount(8);
    // Content is never put in the URL (tool-specifications §2.3).
    expect(new URL(page.url()).search).toBe("");
    expect(new URL(page.url()).hash).toBe("");
    await bothThemesAccessible(page);
  });

  test("detects milliseconds and microseconds; the unit can be set", async ({ page }) => {
    await page.goto("/unix-timestamp-converter");
    await timestampInput(page).fill("1700000000123");
    await expect(page.getByText("Read as milliseconds (13 digits).")).toBeVisible();
    await expect(row(page, "UTC (ISO 8601)")).toHaveText("2023-11-14T22:13:20.123Z");

    await timestampInput(page).fill("1700000000123456");
    await expect(page.getByText("Read as microseconds (16 digits).")).toBeVisible();
    await expect(row(page, "UTC (ISO 8601)")).toHaveText("2023-11-14T22:13:20.123456Z");

    await timestampInput(page).fill("1700000000");
    await page.getByRole("combobox", { name: "Unit" }).click();
    await page.getByRole("option", { name: "Milliseconds" }).click();
    await expect(page.getByText(/^Read as \w+ \(\d+ digits\)\.$/)).toBeHidden();
    await expect(row(page, "UTC (ISO 8601)")).toHaveText("1970-01-20T16:13:20.000Z");
  });

  test("negative timestamps are dates before 1970", async ({ page }) => {
    await page.goto("/unix-timestamp-converter");
    await timestampInput(page).fill("-86400");
    await expect(row(page, "UTC (ISO 8601)")).toHaveText("1969-12-31T00:00:00.000Z");
    await expect(row(page, "Seconds")).toHaveText("-86400");
  });

  test("invalid input is explained and linked to the field", async ({ page }) => {
    await page.goto("/unix-timestamp-converter");
    await timestampInput(page).fill("2023-11-14");
    await expect(timestampInput(page)).toHaveAttribute("aria-invalid", "true");
    await expect(timestampInput(page)).toHaveAccessibleDescription(
      /A Unix timestamp contains only digits/,
    );
    await timestampInput(page).fill("12345678901234567890");
    await expect(page.getByText(/^20 digits is too long/).first()).toBeVisible();
    await expect(results(page, "Timestamp to date")).toHaveCount(0);
    await bothThemesAccessible(page);
  });

  test("date to timestamp, across a DST change", async ({ page }) => {
    await page.goto("/unix-timestamp-converter");
    await chooseZone(page, "Berlin", "Europe/Berlin");
    await dateInput(page).fill("2023-11-14T23:13:20");
    await expect(dateInput(page)).toHaveValue("2023-11-14T23:13:20");
    await expect(row(page, "Unix timestamp (seconds)")).toHaveText("1700000000");
    await expect(row(page, "Milliseconds")).toHaveText("1700000000000");

    // 02:30 didn't exist in Berlin on 2024-03-31: converted as 03:30 CEST.
    await dateInput(page).fill("2024-03-31T02:30");
    await expect(page.getByText(/doesn’t exist in Europe\/Berlin/)).toContainText("03:30:00");
    await expect(row(page, "Unix timestamp (seconds)")).toHaveText("1711848600");

    // 02:30 happened twice on 2024-10-27: the first (CEST) is used.
    await dateInput(page).fill("2024-10-27T02:30");
    await expect(page.getByText(/happens twice in Europe\/Berlin/)).toContainText("UTC+02:00");
    await expect(row(page, "Unix timestamp (seconds)")).toHaveText("1729989000");
    await bothThemesAccessible(page);
  });

  test("keyboard only: pick a zone and convert", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await page.goto("/unix-timestamp-converter");
    // Keys pressed before hydration do nothing; the clock shows once it's done.
    await expect(page.getByTestId("clock")).toHaveText(/^\d+$/);
    await page.getByRole("combobox", { name: "Time zone" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByPlaceholder("Search time zones…")).toBeFocused();
    await page.keyboard.type("Tokyo");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox", { name: "Time zone" })).toHaveText("Asia/Tokyo");
    // Closing returns focus to the trigger; only then move on.
    await expect(page.getByRole("combobox", { name: "Time zone" })).toBeFocused();
    await timestampInput(page).focus();
    await page.keyboard.type("1700000000");
    await expect(row(page, "Asia/Tokyo")).toHaveText("2023-11-15T07:13:20.000+09:00");
    await page.getByRole("button", { name: "Now" }).first().focus();
    await page.keyboard.press("Enter");
    await expect(timestampInput(page)).toHaveValue(/^\d{10}$/);
  });

  test("remembers options, never content", async ({ page }) => {
    await page.goto("/unix-timestamp-converter");
    await chooseZone(page, "Kolkata", "Asia/Kolkata");
    await timestampInput(page).fill("1234567890");
    await expect(row(page, "Asia/Kolkata")).toBeVisible();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain("ts:v1:opts:unix-timestamp-converter");
    expect(stored).toContain("Asia/Kolkata");
    expect(stored).not.toContain("1234567890");

    await page.reload();
    await expect(page.getByRole("combobox", { name: "Time zone" })).toHaveText("Asia/Kolkata");
    await expect(timestampInput(page)).toHaveValue("");
  });
});
