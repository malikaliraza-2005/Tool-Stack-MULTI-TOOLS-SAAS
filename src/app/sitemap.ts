import type { MetadataRoute } from "next";
import { GUIDES } from "@/guides/registry";
import { absoluteUrl, GUIDES_INDEX, guidePath } from "@/lib/seo";
import { CATEGORIES, CATEGORY_ORDER, publishedTools } from "@/tools/registry";

// Generated at build time (architecture §12). Lists pages that exist: the
// homepage, category hubs, published tools, the site pages and the guides;
// the component gallery is never listed.
export const dynamic = "force-static";

const SITE_PAGES = ["/about", "/privacy", "/terms", "/licenses"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/") },
    ...CATEGORY_ORDER.map((category) => ({ url: absoluteUrl(CATEGORIES[category].href) })),
    ...publishedTools().map((tool) => ({
      url: absoluteUrl(`/${tool.slug}`),
      lastModified: tool.updatedAt,
    })),
    ...SITE_PAGES.map((path) => ({ url: absoluteUrl(path) })),
    { url: absoluteUrl(GUIDES_INDEX.path) },
    ...GUIDES.map(({ meta }) => ({
      url: absoluteUrl(guidePath(meta)),
      lastModified: meta.updated,
    })),
  ];
}
