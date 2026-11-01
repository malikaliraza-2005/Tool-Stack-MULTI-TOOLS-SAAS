import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/config/site";
import { OG_COLORS } from "@/lib/og";

// Web app manifest (G-5, P7-T14). Colors are sRGB: not every browser reads
// OKLCH in a manifest. Emitted as out/manifest.webmanifest.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Private, browser-based PDF, image and developer tools. Nothing is uploaded.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: OG_COLORS.bg,
    theme_color: OG_COLORS.bg,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
