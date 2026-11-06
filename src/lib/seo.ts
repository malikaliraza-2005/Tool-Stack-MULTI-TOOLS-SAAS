// Metadata and JSON-LD generated from the registry (architecture §12).
// Everything here is built from registry data, never from user content.

import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/config/site";
import type { GuideMeta } from "@/guides/types";
import { HUBS } from "@/tools/hubs";
import { CATEGORIES } from "@/tools/registry";
import type { ToolCategory, ToolDefinition, ToolFaq } from "@/tools/types";

/** `absoluteUrl("/merge-pdf")` → "https://keptlocal.app/merge-pdf". */
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
    // The registry title already ends with "| KeptLocal".
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
function faqPageJsonLd(faqs: readonly ToolFaq[]): JsonLdNode | null {
  if (faqs.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function faqJsonLd(tool: ToolDefinition): JsonLdNode | null {
  return faqPageJsonLd(tool.seo.faqs);
}

/** All structured data of a tool page as one `@graph`. */
export function toolJsonLd(tool: ToolDefinition): JsonLdNode {
  const graph = [breadcrumbJsonLd(tool), webApplicationJsonLd(tool), faqJsonLd(tool)].filter(
    (node): node is JsonLdNode => node !== null,
  );
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Metadata for the homepage (page-seo-specs §4.1). */
export function homeMetadata(seo: { title: string; description: string }): Metadata {
  const url = absoluteUrl("/");
  const { title, description } = seo;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: SITE_NAME, locale: "en_US" },
    twitter: { card: "summary", title, description },
  };
}

/** WebSite, Organization and the visible homepage FAQs. No SearchAction: there is no search URL. */
export function homeJsonLd(faqs: readonly ToolFaq[]): JsonLdNode {
  const url = absoluteUrl("/");
  const graph = [
    { "@type": "WebSite", name: SITE_NAME, url },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url,
      logo: absoluteUrl("/icons/icon-512.png"),
      email: CONTACT_EMAIL,
    },
    faqPageJsonLd(faqs),
  ].filter((node): node is JsonLdNode => node !== null);
  return { "@context": "https://schema.org", "@graph": graph };
}

/** A site page such as About or Privacy (page-seo-specs §4.3). */
export type SitePageSeo = {
  path: string;
  /** Full title; site pages other than About end with "· KeptLocal". */
  title: string;
  description: string;
  /** Breadcrumb and JSON-LD name. */
  name: string;
  type: "AboutPage" | "WebPage";
  /** ISO date shown as "Last updated" and used as dateModified. */
  updated?: string;
};

export function sitePageMetadata(page: SitePageSeo): Metadata {
  const url = absoluteUrl(page.path);
  const { title, description } = page;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: SITE_NAME, locale: "en_US" },
    twitter: { card: "summary", title, description },
  };
}

/** BreadcrumbList (KeptLocal › page) and the page itself. */
export function sitePageJsonLd(page: SitePageSeo): JsonLdNode {
  const url = absoluteUrl(page.path);
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: page.name, item: url },
    ],
  };
  const node = {
    "@type": page.type,
    name: page.name,
    url,
    description: page.description,
    ...(page.updated ? { dateModified: page.updated } : {}),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
  };
  return { "@context": "https://schema.org", "@graph": [breadcrumb, node] };
}

export const GUIDES_INDEX = {
  path: "/guides",
  title: "Guides: PDFs, Images and Code, Done Privately | KeptLocal",
  description:
    "Practical guides to the jobs KeptLocal’s tools do: removing location data from photos, reading JWTs, converting HEIC and more, with sources.",
  name: "Guides",
};

export function guidePath(guide: Pick<GuideMeta, "slug">): string {
  return `/guides/${guide.slug}`;
}

/** Metadata for a guide (page-seo-specs §4.4): an article with its dates. */
export function guideMetadata(guide: GuideMeta): Metadata {
  const url = absoluteUrl(guidePath(guide));
  const { title, description } = guide;
  return {
    title: { absolute: title },
    description,
    authors: [{ name: guide.author }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: SITE_NAME,
      locale: "en_US",
      publishedTime: guide.published,
      modifiedTime: guide.updated,
      authors: [guide.author],
    },
    twitter: { card: "summary", title, description },
  };
}

/** BreadcrumbList (KeptLocal › Guides › guide) and an Article matching the visible byline. */
export function guideJsonLd(guide: GuideMeta): JsonLdNode {
  const url = absoluteUrl(guidePath(guide));
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: GUIDES_INDEX.name,
        item: absoluteUrl(GUIDES_INDEX.path),
      },
      { "@type": "ListItem", position: 3, name: guide.h1, item: url },
    ],
  };
  const article = {
    "@type": "Article",
    headline: guide.h1,
    description: guide.description,
    url,
    mainEntityOfPage: url,
    datePublished: guide.published,
    dateModified: guide.updated,
    author: { "@type": "Person", name: guide.author, url: absoluteUrl("/about") },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icons/icon-512.png"),
    },
    citation: guide.sources.map((source) => source.url),
  };
  return { "@context": "https://schema.org", "@graph": [breadcrumb, article] };
}

/** BreadcrumbList and a CollectionPage listing every guide. */
export function guidesIndexJsonLd(guides: readonly GuideMeta[]): JsonLdNode {
  const url = absoluteUrl(GUIDES_INDEX.path);
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: GUIDES_INDEX.name, item: url },
    ],
  };
  const collection = {
    "@type": "CollectionPage",
    name: GUIDES_INDEX.name,
    url,
    description: GUIDES_INDEX.description,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: guides.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: guide.h1,
        url: absoluteUrl(guidePath(guide)),
      })),
    },
  };
  return { "@context": "https://schema.org", "@graph": [breadcrumb, collection] };
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
