import { buildSearchIndex } from "@/tools/search-index";
import type { ToolDefinition } from "@/tools/types";
import type { HeroTool } from "./suggest";

/** Registry data the homepage hero needs, built on the server (no SEO text). */
export function heroTools(tools: readonly ToolDefinition[]): HeroTool[] {
  const entries = buildSearchIndex(tools);
  return tools.map((tool, i) => ({
    ...entries[i]!,
    ...(tool.input.accepts ? { accepts: tool.input.accepts } : {}),
    ...(tool.input.detect ? { detect: tool.input.detect } : {}),
  }));
}
