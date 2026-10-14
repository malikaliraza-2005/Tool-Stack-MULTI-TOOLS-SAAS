import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { publishedTools } from "@/tools/registry";

// Generated at build time (architecture §12). Lists pages that exist: the
// homepage and published tools. Hubs, static pages and guides are added with
// their phases; the component gallery is never listed.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/") },
    ...publishedTools().map((tool) => ({
      url: absoluteUrl(`/${tool.slug}`),
      lastModified: tool.updatedAt,
    })),
  ];
}
