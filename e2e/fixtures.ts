import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

type CspViolation = { blockedURI: string; violatedDirective: string };

declare global {
  interface Window {
    __cspViolations: CspViolation[];
  }
}

type Fixtures = {
  /**
   * Records every request made by the page, its workers and service worker.
   * Fails the test if any request leaves the site's origin (the "0 bytes
   * uploaded" guarantee). Requests to `data:` and `blob:` URLs are local.
   */
  noNetwork: { requests: string[] };
  /**
   * Collects CSP violations and page errors. Fails the test on any of them
   * unless the test calls `csp.allowViolations()` and asserts them itself.
   */
  csp: { violations: () => Promise<CspViolation[]>; allowViolations: () => void };
};

export const test = base.extend<Fixtures>({
  noNetwork: [
    async ({ context, baseURL }, use) => {
      const origin = new URL(baseURL!).origin;
      const requests: string[] = [];
      const record = (url: string) => requests.push(url);
      context.on("request", (request) => record(request.url()));
      // Requests from (service) workers are reported on the context in
      // Chromium; also track the worker scripts themselves.
      context.on("serviceworker", (worker) => record(worker.url()));

      await use({ requests });

      const external = requests.filter((url) => {
        if (url.startsWith("data:") || url.startsWith("blob:")) return false;
        return new URL(url).origin !== origin;
      });
      expect(external, "requests left the origin").toEqual([]);
    },
    { auto: true },
  ],

  csp: [
    async ({ page }, use) => {
      let allowed = false;
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", (event) => {
          window.__cspViolations.push({
            blockedURI: event.blockedURI,
            violatedDirective: event.violatedDirective,
          });
        });
      });
      const violations = async () =>
        page.isClosed() ? [] : await page.evaluate(() => window.__cspViolations ?? []);

      await use({ violations, allowViolations: () => (allowed = true) });

      if (!allowed) expect(await violations(), "CSP violations").toEqual([]);
      expect(pageErrors, "uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Runs axe (WCAG 2.2 A/AA rules) on the current page and fails on any violation. */
export async function expectNoA11yViolations(page: Page) {
  // Check the page users interact with: before the app starts, Radix renders
  // roving-focus groups (tabs, segmented controls) with tabindex="-1".
  // `data-app-started` is set by Providers (src/lib/startup-check.ts).
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
  // Let finite animations and transitions finish first: right after a theme
  // switch, colors are mid-transition and axe would measure mixed themes.
  // Endless ones (spinners) are skipped.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, "axe violations").toEqual([]);
}
