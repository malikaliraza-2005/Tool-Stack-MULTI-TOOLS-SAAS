import { readFile, writeFile } from "node:fs/promises";
import type { BrowserContext, Page } from "@playwright/test";
import { makePng } from "../src/lib/files/__fixtures__/images";
import { A4, makePdf } from "../src/lib/pdf/__fixtures__/pdfs";
import { expect, test } from "./fixtures";

// Offline support (G-5, P7-T15/T16). Pages, the app shell and fonts are
// precached when the service worker installs; a tool's on-intent libraries
// and WASM are cached the first time it runs. Offline is simulated by
// aborting every request (architecture §10: `setOffline` doesn't reproduce
// real offline behaviour with a service worker), so Chromium only.

test.use({ serviceWorkers: "allow" });

const SW_FILE = "out/serwist/sw.js";
test.skip(({ browserName }) => browserName !== "chromium", "Offline routing is Chromium-only");
test.describe.configure({ mode: "serial" });

async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
  // Installed (precache complete), active and controlling this page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
      );
    }
  });
}

async function goOffline(context: BrowserContext) {
  await context.route("**/*", (route) => route.abort("internetdisconnected"));
}

const pdf = async (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from(await makePdf(name, [A4])),
});

const png = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: Buffer.from(makePng(64, 64, (x, y) => [x * 4, y * 4, 128, 255])),
};

test("web app manifest is linked and valid", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: "Sprigkit", start_url: "/", display: "standalone" });
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
});

test("developer tool: every page works offline after the first visit", async ({
  page,
  context,
}) => {
  test.slow();
  await page.goto("/");
  await waitForServiceWorker(page);
  await goOffline(context);

  // Never visited, precached at install: the page and the editor chunks.
  await page.goto("/json-formatter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "JSON formatter, validator and viewer",
  );
  const input = page.getByRole("textbox", { name: "JSON input" });
  await input.focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  await input.fill('{"offline":true}');
  await expect(page.getByRole("textbox", { name: "Formatted JSON output" })).toContainText(
    '"offline": true',
  );

  // Hubs and the palette's tool list too.
  await page.goto("/image-tools");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Image tools");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: /Search tools and actions/ }).fill("merge");
  await expect(page.getByRole("option", { name: /Merge PDF/ })).toBeVisible();
});

test("PDF tool: runs offline after it has been used once", async ({ page, context }) => {
  test.slow();
  await page.goto("/merge-pdf");
  await waitForServiceWorker(page);
  const merge = async () => {
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([await pdf("a.pdf"), await pdf("b.pdf")]);
    await page.getByRole("button", { name: "Merge 2 PDFs" }).click();
    await expect(page.getByRole("heading", { name: "merged.pdf is ready" })).toBeVisible();
  };
  await merge();

  await goOffline(context);
  await page.reload();
  await merge();
});

test("image tool: runs offline after it has been used once", async ({ page, context }) => {
  test.slow();
  await page.goto("/compress-image");
  await waitForServiceWorker(page);
  const compress = async () => {
    await page.locator('input[type="file"]').first().setInputFiles(png);
    await page.getByRole("button", { name: "Compress image" }).click();
    await expect(
      page.getByRole("heading", { name: "photo-compressed.png is ready" }),
    ).toBeVisible();
  };
  await compress();

  await goOffline(context);
  await page.reload();
  await compress();
});

test("a new version waits for the user to refresh", async ({ page }) => {
  await page.goto("/");
  await waitForServiceWorker(page);

  // A deploy changes the worker script. Playwright can't route the browser's
  // own update check, so change the served file (restored afterwards).
  const original = await readFile(SW_FILE, "utf8");
  try {
    await writeFile(
      SW_FILE,
      `${original}
// next version`,
    );
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });

    const toast = page.getByText("A new version of Sprigkit is available");
    await expect(toast).toBeVisible();
    // Nothing reloads on its own.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const reloaded = page.waitForEvent("load");
    await page.getByRole("button", { name: "Refresh" }).click();
    await reloaded;
    await expect(toast).toBeHidden();
  } finally {
    await writeFile(SW_FILE, original);
  }
});
