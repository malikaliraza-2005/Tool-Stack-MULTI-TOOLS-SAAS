// Metadata and JSON-LD generated from the registry (architecture §12).
// Everything here is built from registry data, never from user content.

import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/config/site";
import { HUBS } from "@/tools/hubs";
import { CATEGORIES } from "@/tools/registry";
import type { ToolCategory, ToolDefinition } from "@/tools/types";

/** `absoluteUrl("/merge-pdf")` → "https://sprigkit.com/merge-pdf". */
export function absoluteUrl(path: string): string {
  const origin = SITE_URL.replace(/\/+$/, "");
  if (path === "/" || path === "") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toolPath(tool: Pick<ToolDefinition, "slug">): string {
  return `/${tool.slug}`;
}

/** Title, description, canonical, Open Graph and Twitter card for a tool page. */
export function toolMetadata(tool: ToolDefinition): Metadata {
  const url = absoluteUrl(toolPath(tool));
  const { title, description } = tool.seo;
  return {
    // The registry title already ends with "| Sprigkit".
    title: { absolute: title },
    description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: SITE_NAME,
      locale: "en_US",
      ...(tool.seo.ogImage ? { images: [absoluteUrl(tool.seo.ogImage)] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(tool.seo.ogImage ? { images: [absoluteUrl(tool.seo.ogImage)] } : {}),
    },
  };
}

type JsonLdNode = Record<string, unknown>;

export function breadcrumbJsonLd(tool: ToolDefinition): JsonLdNode {
  const category = CATEGORIES[tool.category];
  const items = [
    { name: SITE_NAME, url: absoluteUrl("/") },
    { name: category.name, url: absoluteUrl(category.href) },
    { name: tool.name, url: absoluteUrl(toolPath(tool)) },
  ];
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webApplicationJsonLd(tool: ToolDefinition): JsonLdNode {
  return {
    "@type": "WebApplication",
    name: tool.name,
    url: absoluteUrl(toolPath(tool)),
    description: tool.seo.description,
    applicationCategory: CATEGORIES[tool.category].applicationCategory,
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript and a current web browser.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

/** Only for FAQs that are visible on the page (architecture §12). */
export function faqJsonLd(tool: ToolDefinition): JsonLdNode | null {
  if (tool.seo.faqs.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: tool.seo.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

/** All structured data of a tool page as one `@graph`. */
export function toolJsonLd(tool: ToolDefinition): JsonLdNode {
  const graph = [breadcrumbJsonLd(tool), webApplicationJsonLd(tool), faqJsonLd(tool)].filter(
    (node): node is JsonLdNode => node !== null,
  );
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Metadata for a category hub (G-8). */
export function hubMetadata(category: ToolCategory): Metadata {
  const url = absoluteUrl(CATEGORIES[category].href);
  const { title, description } = HUBS[category].seo;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: SITE_NAME, locale: "en_US" },
    twitter: { card: "summary", title, description },
  };
}

/** BreadcrumbList and a CollectionPage listing the hub's tools. */
export function hubJsonLd(category: ToolCategory, tools: ToolDefinition[]): JsonLdNode {
  const { name, href } = CATEGORIES[category];
  const url = absoluteUrl(href);
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name, item: url },
    ],
  };
  const collection = {
    "@type": "CollectionPage",
    name,
    url,
    description: HUBS[category].seo.description,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: absoluteUrl(toolPath(tool)),
      })),
    },
  };
  return { "@context": "https://schema.org", "@graph": [breadcrumb, collection] };
}

// <, >, & and the line/paragraph separators U+2028 and U+2029.
const UNSAFE_IN_SCRIPT = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, "g");

/**
 * JSON for a `<script type="application/ld+json">`. Escapes characters that
 * could end the script element or break parsing as JavaScript.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    UNSAFE_IN_SCRIPT,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
