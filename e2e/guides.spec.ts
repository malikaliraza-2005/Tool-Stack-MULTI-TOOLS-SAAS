import { expect, expectNoA11yViolations, test } from "./fixtures";

// Guides (P8-T11, P8-T12): index, template, Article JSON-LD and links.

const GUIDES = [
  { slug: "remove-location-from-photos", tool: "Remove EXIF Data" },
  { slug: "what-is-inside-a-jwt", tool: "JWT Decoder" },
  { slug: "heic-vs-jpg", tool: "Convert Image" },
];

test("the index lists every guide and is accessible", async ({ page }) => {
  await page.goto("/guides");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guides");
  const links = page.getByRole("main").getByRole("article").getByRole("link");
  await expect(links).toHaveCount(GUIDES.length);
  for (const { slug } of GUIDES) {
    await expect(page.locator(`a[href="/guides/${slug}"]`)).toHaveCount(1);
  }
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
});

for (const guide of GUIDES) {
  test(`${guide.slug}: byline, Article JSON-LD, tools, sources`, async ({ page }) => {
    const response = await page.goto(`/guides/${guide.slug}`);
    expect(response?.status()).toBe(200);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(new RegExp(`^https?://[^/]+/guides/${guide.slug}$`));
    expect(await page.title()).toMatch(/\| Sprigkit$/);
    expect(await page.locator('meta[property="og:type"]').getAttribute("content")).toBe("article");

    const graph = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    )["@graph"] as Record<string, unknown>[];
    expect(graph.map((node) => node["@type"])).toEqual(["BreadcrumbList", "Article"]);
    const article = graph[1]!;
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveText(article.headline as string);

    // The byline shows the same author and date as the structured data.
    const byline = page.getByText(/^By Ali Raza · Published/);
    await expect(byline).toBeVisible();
    await expect(byline.locator("time").first()).toHaveAttribute(
      "datetime",
      article.datePublished as string,
    );

    await expect(
      page.getByRole("region", { name: "Tools used in this guide" }).getByRole("link", {
        name: guide.tool,
      }),
    ).toBeVisible();
    const sources = page.getByRole("region", { name: "Sources" }).getByRole("link");
    expect(await sources.count()).toBeGreaterThan(0);
    for (const source of await sources.all()) {
      expect(await source.getAttribute("href")).toMatch(/^https:\/\//);
    }

    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expectNoA11yViolations(page);
    }
  });
}

test("hubs link to their guides", async ({ page }) => {
  await page.goto("/image-tools");
  await page
    .getByRole("region", { name: "Guides" })
    .getByRole("link", { name: "How to remove location data from photos" })
    .click();
  await expect(page).toHaveURL(/\/guides\/remove-location-from-photos$/);
});

test("unknown guide slugs are 404", async ({ page }) => {
  const response = await page.goto("/guides/not-a-real-guide");
  expect(response?.status()).toBe(404);
});
