import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMetadata } from "@/lib/seo";
import { TOOL_CONTENT } from "@/tools/content";
import { getTool, publishedTools } from "@/tools/registry";

// One static HTML file per published tool; anything else is a 404 (architecture §5).
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedTools().map((tool) => ({ tool: tool.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[tool]">): Promise<Metadata> {
  const tool = getTool((await params).tool);
  return tool ? toolMetadata(tool) : {};
}

export default async function ToolRoute({ params }: PageProps<"/[tool]">) {
  const tool = getTool((await params).tool);
  if (!tool) notFound();
  const Content = TOOL_CONTENT[tool.slug];
  // Fails the build: every published tool needs supporting content (DoD 9).
  if (!Content)
    throw new Error(`No content for tool "${tool.slug}". Add it to src/tools/content.ts.`);
  return <ToolPage tool={tool} content={<Content />} />;
}
