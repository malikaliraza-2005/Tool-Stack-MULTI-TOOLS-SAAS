import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Allow all crawlers (D-7). Preview hosts are kept out of the index by the
// X-Robots-Tag rule in public/_headers, and /_gallery by its noindex meta tag
// (a robots.txt Disallow would hide that tag from crawlers).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
