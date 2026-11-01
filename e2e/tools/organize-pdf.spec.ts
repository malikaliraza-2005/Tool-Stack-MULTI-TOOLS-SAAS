import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { A4, makeEncryptedPdf, makePdf } from "../../src/lib/pdf/__fixtures__/pdfs";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// Organize PDF end to end (tool-specifications §3.3). noNetwork and csp run
// automatically: the PDF and its thumbnails never leave the browser.

/** Pages 1..n with widths 400, 410, 420…, so the output order can be read back. */
const numbered = (count: number) =>
  makePdf(
    "doc",
    Array.from({ length: count }, (_, i): [number, number] => [400 + i * 10, 800]),
  );

/** 1-based source page numbers and rotations of a saved PDF, from the page widths. */
async function outputOf(download: Download) {
  const doc = await PDFDocument.load(await readFile((await download.path())!));
  return doc.getPages().map((page) => {
    const number = Math.round((page.getWidth() - 400) / 10) + 1;
    const rotation = page.getRotation().angle;
    return rotation ? `${number}@${rotation}` : `${number}`;
  });
}

// Thumbnails appear once pdf.js has loaded, which can take a while on a busy machine.
const THUMBNAILS = { timeout: 15_000 };

const grid = (page: Page) => page.getByRole("listbox", { name: /^Pages of / });
const option = (page: Page, position: number) =>
  grid(page).getByRole("option", { name: new RegExp(`^Page ${position}(,|$)`) });

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/organize-pdf");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

async function choosePdf(page: Page, name: string, bytes: Uint8Array) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from(bytes) });
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Save PDF" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  return download;
}

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("organize-pdf", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Organize PDF pages");
    await bothThemesAccessible(page);
  });

  test("rotates, deletes and reorders with the toolbar; undo and redo", async ({ page }) => {
    test.slow(); // Axe in both themes with thumbnails.
    await open(page);
    await choosePdf(page, "doc.pdf", await numbered(5));
    await expect(grid(page).getByRole("option")).toHaveCount(5);
    await expect(grid(page).locator("img")).toHaveCount(5, THUMBNAILS);
    await bothThemesAccessible(page);

    await option(page, 2).click();
    await page.getByRole("button", { name: "Rotate right (R)" }).click();
    await expect(option(page, 2)).toHaveAccessibleName("Page 2, rotated 90°");
    await option(page, 5).click();
    await page.getByRole("button", { name: "Move earlier (Ctrl+←)" }).click();
    await option(page, 1).click();
    await page.getByRole("button", { name: "Delete (Delete)" }).click();
    await expect(grid(page).getByRole("option")).toHaveCount(4);

    // Undo the delete, then redo it.
    await page.getByRole("button", { name: "Undo (Ctrl+Z)" }).click();
    await expect(grid(page).getByRole("option")).toHaveCount(5);
    await page.getByRole("button", { name: "Redo (Ctrl+Shift+Z)" }).click();
    await expect(grid(page).getByRole("option")).toHaveCount(4);

    expect(await outputOf(await save(page))).toEqual(["2@90", "3", "5", "4"]);
    await expect(page.getByText("doc-organized.pdf is ready")).toBeVisible();
  });

  test("keyboard only: select, rotate, move, delete, undo", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await choosePdf(page, "doc.pdf", await numbered(4));
    await expect(grid(page).locator("img")).toHaveCount(4, THUMBNAILS);
    await grid(page).focus();
    // Page 1 has focus: move to page 3, rotate it left, move it to the front.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+R");
    await page.keyboard.press("ControlOrMeta+ArrowLeft");
    await page.keyboard.press("ControlOrMeta+ArrowLeft");
    await expect(
      page.getByRole("status").filter({ hasText: "moved to position 1 of 4" }),
    ).toBeAttached();
    // Select pages 1 and 2 (after the move) and delete them, then undo.
    await page.keyboard.press("Home");
    await page.keyboard.press("Space");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Delete");
    await expect(grid(page).getByRole("option")).toHaveCount(2);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(grid(page).getByRole("option")).toHaveCount(4);
    expect(await outputOf(await save(page))).toEqual(["3@270", "1", "2", "4"]);
  });

  test("drags a page to a new place, lifting it as a card", async ({ page, isMobile }) => {
    test.skip(isMobile, "Mouse drag; touch is tested below");
    await open(page);
    await choosePdf(page, "doc.pdf", await numbered(4));
    await expect(grid(page).locator("img")).toHaveCount(4, THUMBNAILS);
    const from = await option(page, 1).boundingBox();
    const to = await option(page, 3).boundingBox();
    // Drop on the right half of page 3: page 1 goes after it.
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 3);
    await page.mouse.down();
    await page.mouse.move(to!.x + to!.width * 0.75, to!.y + to!.height / 3, { steps: 12 });
    // Mid-drag: the page has left the grid and a drop slot is open.
    await expect(page.getByText("Drop here")).toBeVisible();
    await expect(grid(page).getByRole("option")).toHaveCount(3);
    await page.mouse.up();
    await expect(page.getByText("Drop here")).toBeHidden();
    expect(await outputOf(await save(page))).toEqual(["2", "3", "1", "4"]);
  });

  test("Escape cancels a drag", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard during a mouse drag");
    await open(page);
    await choosePdf(page, "doc.pdf", await numbered(3));
    await expect(grid(page).locator("img")).toHaveCount(3, THUMBNAILS);
    const from = await option(page, 1).boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 3);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width * 2, from!.y + from!.height / 3, { steps: 8 });
    await expect(page.getByText("Drop here")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Undo (Ctrl+Z)" })).toBeDisabled();
  });

  test("touch: a short press lifts the page, then it drags", async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(
      !isMobile || browserName !== "chromium",
      "Real touch events need the Android (Chromium) project",
    );
    await open(page);
    await choosePdf(page, "doc.pdf", await numbered(4));
    await expect(grid(page).locator("img")).toHaveCount(4, THUMBNAILS);
    await grid(page).scrollIntoViewIfNeeded();
    const from = (await option(page, 1).boundingBox())!;
    const to = (await option(page, 4).boundingBox())!;
    const start = { x: from.x + from.width / 2, y: from.y + from.height / 3 };
    const end = { x: to.x + to.width * 0.7, y: to.y + to.height / 3 };
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, x?: number, y?: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type: type as "touchStart",
        touchPoints: x === undefined ? [] : [{ x, y: y!, id: 1 }],
      });
    await touch("touchStart", start.x, start.y);
    await page.waitForTimeout(320);
    for (let i = 1; i <= 12; i++) {
      await touch(
        "touchMove",
        start.x + ((end.x - start.x) * i) / 12,
        start.y + ((end.y - start.y) * i) / 12,
      );
    }
    await expect(page.getByText("Drop here")).toBeVisible();
    await touch("touchEnd");
    expect(await outputOf(await save(page))).toEqual(["2", "3", "4", "1"]);
  });

  test("never deletes the last page", async ({ page }) => {
    await open(page);
    await choosePdf(page, "doc.pdf", await numbered(2));
    await expect(grid(page).getByRole("option")).toHaveCount(2);
    await page.getByRole("button", { name: "Select all (Ctrl+A)" }).click();
    await page.getByRole("button", { name: "Delete (Delete)" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "at least one page" })).toBeVisible();
    await expect(grid(page).getByRole("option")).toHaveCount(2);
  });

  test("explains a password-protected PDF", async ({ page }) => {
    await open(page);
    await choosePdf(page, "locked.pdf", await makeEncryptedPdf());
    await expect(page.getByText(/locked\.pdf is password-protected/).first()).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("a 300-page document stays responsive", async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== "chromium" || isMobile, "Heavy; desktop Chromium is enough");
    test.setTimeout(120_000);
    await open(page);
    await choosePdf(
      page,
      "long.pdf",
      await makePdf(
        "long",
        Array.from({ length: 300 }, () => A4),
      ),
    );
    await expect(page.getByText("300 pages")).toBeVisible();
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
    // Only the visible rows are in the DOM.
    expect(await grid(page).getByRole("option").count()).toBeLessThan(60);
    // Scroll to the end in steps, as a user would.
    for (let i = 0; i < 100; i++) {
      const atEnd = await grid(page).evaluate((element) => {
        element.scrollBy({ top: element.clientHeight });
        return element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
      });
      await page.waitForTimeout(50);
      if (atEnd) break;
    }
    await expect(option(page, 300)).toBeVisible();
    await expect(option(page, 300).locator("img")).toBeVisible({ timeout: 20_000 });
    // Select all and rotate: one edit across 300 pages.
    await grid(page).focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("r");
    await expect(
      page.getByRole("status").filter({ hasText: "300 pages rotated right." }),
    ).toBeAttached();
    await expect(option(page, 300)).toHaveAccessibleName("Page 300, rotated 90°");
    const maxGap = await page.evaluate(() => {
      const w = window as Window & { __maxGap?: number; __stop?: boolean };
      w.__stop = true;
      return w.__maxGap ?? 0;
    });
    console.log(`300 pages: longest main-thread frame gap ${Math.round(maxGap)} ms`);
    // Thumbnails are painted one at a time on the page; each takes a few tens of ms.
    expect(maxGap).toBeLessThan(500);
  });
});
