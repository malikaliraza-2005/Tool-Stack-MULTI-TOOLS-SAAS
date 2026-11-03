import { describe, expect, it } from "vitest";
import { HOME_FAQS, HOME_SEO } from "@/components/home/home-content";
import { CONTACT_EMAIL, SITE_URL } from "@/config/site";
import { GUIDES } from "@/guides/registry";
import { HUBS } from "@/tools/hubs";
import { getTool, TOOLS } from "@/tools/registry";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqJsonLd,
  guideJsonLd,
  guideMetadata,
  guidesIndexJsonLd,
  homeJsonLd,
  homeMetadata,
  serializeJsonLd,
  sitePageJsonLd,
  sitePageMetadata,
  toolJsonLd,
  toolMetadata,
  webApplicationJsonLd,
} from "./seo";

// The origin follows NEXT_PUBLIC_SITE_URL (set in CI), like the real pages.
const ORIGIN = absoluteUrl("/");
const merge = getTool("merge-pdf")!;

describe("absoluteUrl", () => {
  it("joins paths to SITE_URL", () => {
    expect(ORIGIN).toBe(SITE_URL.replace(/\/+$/, ""));
    expect(absoluteUrl("/merge-pdf")).toBe(`${ORIGIN}/merge-pdf`);
    expect(absoluteUrl("merge-pdf")).toBe(`${ORIGIN}/merge-pdf`);
  });
});

describe("toolMetadata", () => {
  it("builds title, description, canonical, Open Graph and Twitter from the registry", () => {
    const metadata = toolMetadata(merge);
    expect(metadata.title).toEqual({ absolute: merge.seo.title });
    expect(metadata.description).toBe(merge.seo.description);
    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/merge-pdf`);
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: `${ORIGIN}/merge-pdf`,
      title: merge.seo.title,
      siteName: "Ondevo",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("JSON-LD", () => {
  it("BreadcrumbList: Home › category hub › tool", () => {
    expect(breadcrumbJsonLd(merge)).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ondevo", item: ORIGIN },
        { "@type": "ListItem", position: 2, name: "PDF tools", item: `${ORIGIN}/pdf-tools` },
        { "@type": "ListItem", position: 3, name: "Merge PDF", item: `${ORIGIN}/merge-pdf` },
      ],
    });
  });

  it("WebApplication: free, runs in any browser", () => {
    expect(webApplicationJsonLd(getTool("json-formatter")!)).toMatchObject({
      "@type": "WebApplication",
      name: "JSON Formatter",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (web browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
  });

  it("FAQPage mirrors the visible FAQs, and is omitted without FAQs", () => {
    const faq = faqJsonLd(merge);
    expect(faq?.mainEntity).toHaveLength(merge.seo.faqs.length);
    expect((faq?.mainEntity as { name: string }[])[0]?.name).toBe(merge.seo.faqs[0]?.q);
    expect(faqJsonLd({ ...merge, seo: { ...merge.seo, faqs: [] } })).toBeNull();
    const graph = toolJsonLd({ ...merge, seo: { ...merge.seo, faqs: [] } })["@graph"] as unknown[];
    expect(graph).toHaveLength(2);
  });

  it("wraps everything in one schema.org @graph", () => {
    const data = toolJsonLd(merge);
    expect(data["@context"]).toBe("https://schema.org");
    expect((data["@graph"] as { "@type": string }[]).map((n) => n["@type"])).toEqual([
      "BreadcrumbList",
      "WebApplication",
      "FAQPage",
    ]);
  });

  it("serializes safely for an inline script", () => {
    const text = `</script><b>&${String.fromCharCode(0x2028)}`;
    const json = serializeJsonLd({ text });
    expect(json).not.toMatch(/[<>&]/);
    expect(json).not.toContain(String.fromCharCode(0x2028));
    expect(json).toContain("\\u003c/script\\u003e");
    expect(JSON.parse(json)).toEqual({ text });
  });
});

describe("homepage", () => {
  it("has its own title, description and canonical, unused by any tool or hub", () => {
    const meta = homeMetadata(HOME_SEO);
    expect(meta.title).toEqual({ absolute: HOME_SEO.title });
    expect(meta.alternates?.canonical).toBe(ORIGIN);
    expect(HOME_SEO.title.length).toBeLessThanOrEqual(65);
    expect(HOME_SEO.description.length).toBeGreaterThanOrEqual(70);
    expect(HOME_SEO.description.length).toBeLessThanOrEqual(160);
    const taken = new Set(
      [...TOOLS.map((tool) => tool.seo), ...Object.values(HUBS).map((hub) => hub.seo)].flatMap(
        (seo) => [seo.title, seo.description],
      ),
    );
    expect(taken.has(HOME_SEO.title)).toBe(false);
    expect(taken.has(HOME_SEO.description)).toBe(false);
  });

  it("JSON-LD: WebSite, Organization and the visible FAQs", () => {
    const graph = homeJsonLd(HOME_FAQS)["@graph"] as Record<string, unknown>[];
    expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "Organization", "FAQPage"]);
    expect(graph[1]).toMatchObject({ url: ORIGIN, email: CONTACT_EMAIL });
    expect(graph[2]?.mainEntity).toHaveLength(HOME_FAQS.length);
  });
});

describe("site pages", () => {
  const privacy = {
    path: "/privacy",
    title: "Privacy policy · Ondevo",
    description: "How Ondevo handles your data.",
    name: "Privacy policy",
    type: "WebPage" as const,
    updated: "2026-11-02",
  };

  it("metadata uses the full title and an absolute canonical", () => {
    const meta = sitePageMetadata(privacy);
    expect(meta.title).toEqual({ absolute: "Privacy policy · Ondevo" });
    expect(meta.alternates?.canonical).toBe(absoluteUrl("/privacy"));
  });

  it("JSON-LD: Ondevo › page, with dateModified only when dated", () => {
    const graph = sitePageJsonLd(privacy)["@graph"] as Record<string, unknown>[];
    const crumbs = (graph[0]!.itemListElement as { name: string }[]).map((item) => item.name);
    expect(crumbs).toEqual(["Ondevo", "Privacy policy"]);
    expect(graph[1]).toMatchObject({ "@type": "WebPage", dateModified: "2026-11-02" });
    const undated = { ...privacy, type: "AboutPage" as const, updated: undefined };
    expect(sitePageJsonLd(undated)["@graph"]).not.toContainEqual(
      expect.objectContaining({ dateModified: expect.anything() }),
    );
  });
});

describe("guides", () => {
  const guide = GUIDES[0]!.meta;

  it("metadata is an article with its dates and canonical", () => {
    const meta = guideMetadata(guide);
    expect(meta.alternates?.canonical).toBe(absoluteUrl(`/guides/${guide.slug}`));
    expect(meta.openGraph).toMatchObject({
      type: "article",
      publishedTime: guide.published,
      modifiedTime: guide.updated,
    });
  });

  it("JSON-LD: Ondevo › Guides › guide, and an Article matching the byline", () => {
    const graph = guideJsonLd(guide)["@graph"] as Record<string, unknown>[];
    const crumbs = (graph[0]!.itemListElement as { name: string }[]).map((item) => item.name);
    expect(crumbs).toEqual(["Ondevo", "Guides", guide.h1]);
    expect(graph[1]).toMatchObject({
      "@type": "Article",
      headline: guide.h1,
      datePublished: guide.published,
      dateModified: guide.updated,
      author: { "@type": "Person", name: guide.author },
      citation: guide.sources.map((source) => source.url),
    });
  });

  it("the index lists every guide", () => {
    const graph = guidesIndexJsonLd(GUIDES.map((g) => g.meta))["@graph"] as Record<
      string,
      unknown
    >[];
    const list = (graph[1]!.mainEntity as { itemListElement: unknown[] }).itemListElement;
    expect(list).toHaveLength(GUIDES.length);
  });
});
