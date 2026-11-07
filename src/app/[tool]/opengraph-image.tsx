import { OG_SIZE } from "@/lib/og";
import { renderOgCard } from "@/lib/og-card";
import { CATEGORIES, getTool, publishedTools } from "@/tools/registry";

// Open Graph image per tool, rendered at build time (P1-T23).
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "OfflineBench tool";

export function generateStaticParams() {
  return publishedTools().map((tool) => ({ tool: tool.slug }));
}

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const tool = getTool((await params).tool);
  if (!tool) throw new Error("Unknown tool");
  return renderOgCard({
    category: CATEGORIES[tool.category].name,
    title: tool.name,
    text: tool.tagline,
  });
}
