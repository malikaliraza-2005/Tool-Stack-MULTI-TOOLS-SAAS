import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/config/site";
import { getTool } from "@/tools/registry";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqJsonLd,
  serializeJsonLd,
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
      siteName: "Sprigkit",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("JSON-LD", () => {
  it("BreadcrumbList: Home › category hub › tool", () => {
    expect(breadcrumbJsonLd(merge)).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Sprigkit", item: ORIGIN },
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
