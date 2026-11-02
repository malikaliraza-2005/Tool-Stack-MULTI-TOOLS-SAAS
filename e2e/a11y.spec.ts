import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, expectNoA11yViolations, test } from "./fixtures";

// axe on every page in the sitemap and the 404 page, in both themes (P9-T04).
// Tool specs also check their working states; this covers each page as it
// loads. The sitemap is read from the build, so the list follows new pages.

const xml = readFileSync(path.join(__dirname, "../out/sitemap.xml"), "utf8");
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);

test.describe("axe on every page", () => {
  test("the sitemap lists the pages", () => {
    expect(paths.length).toBeGreaterThan(30);
  });

  for (const route of [...paths, "/this-page-does-not-exist"]) {
    test(route, async ({ page }) => {
      await page.goto(route);
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await expectNoA11yViolations(page);
      }
    });
  }
});
