import { expect, expectNoA11yViolations, test } from "./fixtures";

// About, Privacy and Terms (P8-T06..T08): metadata, JSON-LD, accessibility and
// the facts other pages link to.

const PAGES = [
  { path: "/about", h1: "About Sprigkit", name: "About", type: "AboutPage" },
  { path: "/privacy", h1: "Privacy policy", name: "Privacy policy", type: "WebPage" },
  { path: "/terms", h1: "Terms of use", name: "Terms of use", type: "WebPage" },
];

for (const site of PAGES) {
  test(`${site.path}: metadata, JSON-LD and accessibility`, async ({ page }) => {
    const response = await page.goto(site.path);
    expect(response?.status()).toBe(200);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(new RegExp(`^https?://[^/]+${site.path}$`));
    expect(await page.title()).toContain(site.h1);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length).toBeGreaterThanOrEqual(70);

    const graph = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    )["@graph"] as Record<string, unknown>[];
    expect(graph.map((node) => node["@type"])).toEqual(["BreadcrumbList", site.type]);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(site.h1);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(site.name);
    await expect(page.getByRole("link", { name: "officialaliraza2005@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:officialaliraza2005@gmail.com",
    );

    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expectNoA11yViolations(page);
    }
  });
}

test("the homepage's “How to verify” link opens the verification steps", async ({ page }) => {
  await page.goto("/privacy#verify");
  await expect(page.getByRole("heading", { name: "How to verify it yourself" })).toBeInViewport();
});

test("Terms state the visual signature and governing law", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByText("not a certified digital signature")).toBeVisible();
  await expect(page.getByText("governed by the laws of Pakistan")).toBeVisible();
});

test("About lists the tools by category", async ({ page }) => {
  await page.goto("/about");
  for (const name of ["Merge PDF", "Convert Image", "Regex Tester"]) {
    await expect(page.getByRole("main").getByText(name, { exact: false }).first()).toBeVisible();
  }
});
