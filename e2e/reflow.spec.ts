import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, horizontalOverflow, test } from "./fixtures";

// Reflow (WCAG 1.4.10, P9-T07): every page at 320 CSS px wide, and at 640 px,
// which is how a 1280 px window lays out at 200% zoom. No sideways scrolling.
// Text spacing and zoom of individual tool states are covered by the tool
// specs' mobile projects (noOverflow runs after every test).

test.skip(({ browserName, isMobile }) => browserName !== "chromium" || isMobile, "Layout only");

const xml = readFileSync(path.join(__dirname, "../out/sitemap.xml"), "utf8");
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);

for (const width of [320, 640]) {
  test.describe(`${width} px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const route of paths) {
      test(route, async ({ page }) => {
        await page.goto(route);
        await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
        expect(await horizontalOverflow(page), "elements wider than the viewport").toEqual([]);
      });
    }
  });
}
