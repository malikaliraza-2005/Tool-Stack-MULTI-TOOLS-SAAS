import { expect, test } from "./fixtures";

// Generated SEO output of the tool pages (architecture §12, P3-T06..T09).
// The origin comes from NEXT_PUBLIC_SITE_URL at build time, so tests compare
// against the canonical URL instead of hard-coding it.

const TOOLS = [
  { slug: "merge-pdf", name: "Merge PDF", hub: "PDF tools" },
  { slug: "json-formatter", name: "JSON Formatter", hub: "Developer tools" },
  {
    slug: "unix-timestamp-converter",
    name: "Unix Timestamp Converter",
    hub: "Developer tools",
  },
  { slug: "base64-encode-decode", name: "Base64 Encode & Decode", hub: "Developer tools" },
  { slug: "url-encode-decode", name: "URL Encode & Decode", hub: "Developer tools" },
  { slug: "uuid-generator", name: "UUID Generator", hub: "Developer tools" },
  { slug: "hash-generator", name: "Hash Generator", hub: "Developer tools" },
  { slug: "jwt-decoder", name: "JWT Decoder", hub: "Developer tools" },
  { slug: "diff-checker", name: "Diff Checker", hub: "Developer tools" },
  { slug: "regex-tester", name: "Regex Tester", hub: "Developer tools" },
  { slug: "split-pdf", name: "Split PDF", hub: "PDF tools" },
  { slug: "organize-pdf", name: "Organize PDF", hub: "PDF tools" },
  { slug: "jpg-to-pdf", name: "JPG to PDF", hub: "PDF tools" },
  { slug: "pdf-to-jpg", name: "PDF to JPG", hub: "PDF tools" },
];

for (const tool of TOOLS) {
  test(`${tool.slug}: metadata, canonical, Open Graph and JSON-LD`, async ({ page }) => {
    const response = await page.goto(`/${tool.slug}`);
    expect(response?.status()).toBe(200);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(new RegExp(`^https?://[^/]+/${tool.slug}$`));
    const origin = new URL(canonical!).origin;

    expect(await page.title()).toMatch(/\| Sprigkit$/);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length).toBeGreaterThanOrEqual(70);
    expect(await page.locator('meta[property="og:url"]').getAttribute("content")).toBe(canonical);
    expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe(
      "summary_large_image",
    );
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toMatch(new RegExp(`^${origin}/${tool.slug}/opengraph-image`));

    const graph = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    )["@graph"] as Record<string, unknown>[];
    expect(graph.map((node) => node["@type"])).toEqual([
      "BreadcrumbList",
      "WebApplication",
      "FAQPage",
    ]);
    const crumbs = (graph[0]!.itemListElement as { name: string }[]).map((item) => item.name);
    expect(crumbs).toEqual(["Sprigkit", tool.hub, tool.name]);

    // FAQPage mirrors the FAQs visible on the page.
    const questions = (graph[2]!.mainEntity as { name: string }[]).map((q) => q.name);
    const faq = page.getByRole("region", { name: "Frequently asked questions" });
    for (const question of questions) {
      await expect(faq.getByRole("heading", { name: question, level: 3 })).toBeVisible();
    }

    // Breadcrumbs, H1 and the workspace are in the static HTML.
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(tool.name);
    await expect(page.getByRole("region", { name: `${tool.name} workspace` })).toBeVisible();
  });

  test(`${tool.slug}: OG image is a PNG`, async ({ request }) => {
    const res = await request.get(`/${tool.slug}/opengraph-image`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    expect([...(await res.body()).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
}

test("the workspace is in the static HTML (no JavaScript)", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/merge-pdf");
  await expect(page.getByRole("button", { name: "Choose files" })).toBeVisible();
  await page.goto("/json-formatter");
  await expect(page.getByRole("textbox", { name: "JSON input" })).toBeVisible();
  await page.goto("/unix-timestamp-converter");
  await expect(page.getByRole("textbox", { name: "Unix timestamp" })).toBeVisible();
  await context.close();
});

test("sitemap lists the home page and published tools", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(urls).toEqual([
    "/",
    "/merge-pdf",
    "/json-formatter",
    "/unix-timestamp-converter",
    "/base64-encode-decode",
    "/url-encode-decode",
    "/uuid-generator",
    "/hash-generator",
    "/jwt-decoder",
    "/diff-checker",
    "/regex-tester",
    "/split-pdf",
    "/organize-pdf",
    "/jpg-to-pdf",
    "/pdf-to-jpg",
  ]);
  expect(xml).toContain("<lastmod>");
  expect(xml).not.toContain("_gallery");
});

test("robots.txt allows all and points to the sitemap", async ({ request }) => {
  const text = await (await request.get("/robots.txt")).text();
  expect(text).toContain("User-Agent: *");
  expect(text).toContain("Allow: /");
  expect(text).toMatch(/Sitemap: https?:\/\/[^/]+\/sitemap\.xml/);
});

test("unknown tool slugs are 404", async ({ page }) => {
  const response = await page.goto("/sign-pdf");
  expect(response?.status()).toBe(404);
});
