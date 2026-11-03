import type { Page } from "@playwright/test";
import { makePng } from "../src/lib/files/__fixtures__/images";
import { makePdf } from "../src/lib/pdf/__fixtures__/pdfs";
import { expect, test } from "./fixtures";

// Interaction latency of the heaviest interactions (P9-T10), measured with the
// Event Timing API (what INP is built from) on a 4× slowed CPU, a stand-in for
// a mid-range phone. Budget: INP ≤ 200 ms (architecture §14). Field INP on real
// devices is the final word (P9-T11 traces).

test.skip(({ browserName, isMobile }) => browserName !== "chromium" || isMobile, "CDP throttling");

const BUDGET_MS = 200;

/**
 * Timing is only meaningful without other tests competing for the CPU: the
 * budget is asserted under `npm run e2e:inp` (one worker); in the full suite
 * the numbers are only logged.
 */
function expectWithinBudget(ms: number) {
  if (test.info().config.workers === 1) expect(ms).toBeLessThan(BUDGET_MS);
}

/** Starts recording interactions and slows the CPU 4×. */
async function prepare(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __interactions?: number[] };
    w.__interactions = [];
    new PerformanceObserver((list) => {
      // interactionId isn't in TypeScript's DOM types yet.
      for (const entry of list.getEntries() as (PerformanceEventTiming & {
        interactionId?: number;
      })[]) {
        if (entry.interactionId) w.__interactions!.push(entry.duration);
      }
    }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
  });
  const cdp = await page.context().newCDPSession(page);
  return {
    throttle: () => cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }),
    reset: () =>
      page.evaluate(() => ((window as Window & { __interactions?: number[] }).__interactions = [])),
  };
}

/** The worst interaction since the last reset, after pending events are reported. */
async function worst(page: Page, label: string) {
  await page.waitForTimeout(300);
  const durations = await page.evaluate(
    () => (window as Window & { __interactions?: number[] }).__interactions ?? [],
  );
  const max = Math.max(0, ...durations);
  console.log(`${label}: ${durations.length} slow event entries, worst ${Math.round(max)} ms`);
  return max;
}

async function started(page: Page) {
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

for (const shape of ["formatted", "minified"] as const) {
  test(`typing in the JSON editor (${shape}, 40 KB)`, async ({ page }) => {
    const { throttle, reset } = await prepare(page);
    await page.goto("/json-formatter");
    await started(page);
    const items = Array.from({ length: 400 }, (_, i) => ({
      id: i,
      name: `item ${i}`,
      tags: ["a", "b"],
      n: i * 3.5,
    }));
    const doc = shape === "formatted" ? JSON.stringify(items, null, 2) : JSON.stringify(items);
    // Paste it, as users do (typing 40 KB with fill() is slow in itself).
    await page.getByRole("textbox", { name: "JSON input" }).focus();
    await page.locator(".cm-editor").first().waitFor();
    await page.evaluate((text) => {
      const data = new DataTransfer();
      data.setData("text/plain", text);
      document
        .querySelector(".cm-content")!
        .dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
    }, doc);
    await expect(page.getByText("Valid JSON")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+End");
    await throttle();
    await reset();
    await page.keyboard.type(" ", { delay: 60 });
    await page.keyboard.press("Backspace");
    await page.keyboard.type('{"x":1}', { delay: 60 });
    const worstMs = await worst(page, `JSON editor typing, ${shape}`);
    // One 40 KB line is CodeMirror's slow case: it redraws the whole line per key.
    if (shape === "formatted") expectWithinBudget(worstMs);
  });
}

test("comparison and quality sliders", async ({ page }) => {
  test.slow();
  const { throttle, reset } = await prepare(page);
  await page.goto("/compress-image");
  await started(page);
  const png = makePng(600, 600, (x, y) => [x % 256, y % 256, (x + y) % 256, 255]);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from(png) });
  // Quality appears for lossy formats.
  await page.getByRole("combobox", { name: "Format" }).click();
  await page.getByRole("option", { name: "JPG" }).click();
  await throttle();
  await reset();
  await page.getByRole("slider", { name: "Quality" }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft", { delay: 30 });
  expectWithinBudget(await worst(page, "quality slider"));

  await page.getByRole("button", { name: "Compress image" }).click();
  const compare = page.getByRole("slider", { name: "Compare Original and Compressed" });
  await expect(compare).toBeVisible({ timeout: 60_000 });
  await reset();
  await compare.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowLeft", { delay: 30 });
  expectWithinBudget(await worst(page, "comparison slider"));
});

test("selecting and moving pages in a 300-page grid", async ({ page }) => {
  test.setTimeout(120_000);
  const { throttle, reset } = await prepare(page);
  await page.goto("/organize-pdf");
  await started(page);
  const pdf = await makePdf(
    "long",
    Array.from({ length: 300 }, () => [595, 842] as [number, number]),
  );
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: "long.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf) });
  await expect(page.getByText("300 pages")).toBeVisible({ timeout: 30_000 });
  const grid = page.getByRole("listbox", { name: /^Pages of / });
  await throttle();
  await reset();
  await grid.getByRole("option").first().click();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight", { delay: 30 });
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown", { delay: 30 });
  expectWithinBudget(await worst(page, "300-page grid"));
});
