import { expect, test } from "./fixtures";

// Crawl of the built site from the homepage (P9-T16): every internal link
// resolves, every sitemap page is reachable by links (no orphans), and every
// page's canonical is its own path. External links are listed, never fetched.

test.skip(({ browserName, isMobile }) => browserName !== "chromium" || isMobile, "HTTP only");

const hrefs = (html: string) =>
  [...html.matchAll(/<a\b[^>]*?\shref="([^"]+)"/g)].map((m) => m[1]!.replaceAll("&amp;", "&"));

test("every internal link resolves and every sitemap page is linked", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const sitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  const origin = new URL(xml.match(/<loc>([^<]+)<\/loc>/)![1]!).origin;

  const queue = ["/"];
  const seen = new Set(queue);
  const broken: string[] = [];
  const badCanonicals: string[] = [];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const response = await request.get(path, { maxRedirects: 0 });
    if (response.status() !== 200) {
      broken.push(`${path} → ${response.status()}`);
      continue;
    }
    if (!response.headers()["content-type"]?.includes("text/html")) continue;
    const html = await response.text();

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const expected = path === "/" ? [origin, `${origin}/`] : [`${origin}${path}`];
    if (!expected.includes(canonical ?? "")) {
      badCanonicals.push(`${path}: ${canonical ?? "none"}`);
    }

    for (const href of hrefs(html)) {
      if (href.startsWith("#") || /^(mailto|tel):/.test(href)) continue;
      const url = new URL(href, `${origin}${path}`);
      if (url.origin !== origin) continue;
      if (!seen.has(url.pathname)) {
        seen.add(url.pathname);
        queue.push(url.pathname);
      }
    }
  }

  expect(broken, "links that don't return 200").toEqual([]);
  expect(badCanonicals, "canonicals that aren't the page's own URL").toEqual([]);
  expect(
    sitemap.filter((path) => !seen.has(path)),
    "sitemap pages no link reaches",
  ).toEqual([]);
});
