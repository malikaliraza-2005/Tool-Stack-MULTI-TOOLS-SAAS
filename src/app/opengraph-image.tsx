import { OG_SIZE } from "@/lib/og";
import { renderOgCard } from "@/lib/og-card";

// Shared Open Graph image for every page without its own: home, hubs, site
// pages and guides. Tool pages override it with app/[tool]/opengraph-image.tsx.
export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "OfflineBench: private PDF, image and developer tools";

export default function Image() {
  return renderOgCard({
    title: "Private tools for PDFs, images and code",
    text: "Everything runs in your browser. Nothing is uploaded.",
  });
}
