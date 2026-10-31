// The tool registry: single source of truth for every tool (tool-registry.md).
// Validated when this module loads; pages, metadata and the sitemap import it
// at build time, so an invalid entry fails the build.

import { detectorIds } from "@/lib/detect";
import { meta as base64EncodeDecode } from "./base64-encode-decode/meta";
import { meta as jsonFormatter } from "./json-formatter/meta";
import { meta as mergePdf } from "./merge-pdf/meta";
import { meta as unixTimestampConverter } from "./unix-timestamp-converter/meta";
import { meta as urlEncodeDecode } from "./url-encode-decode/meta";
import type { ToolCategory, ToolDefinition } from "./types";
import { assertValidRegistry, type RegistryContext } from "./validate";

export const TOOLS: readonly ToolDefinition[] = [
  mergePdf,
  jsonFormatter,
  unixTimestampConverter,
  base64EncodeDecode,
  urlEncodeDecode,
];

/**
 * Final MVP slugs (D-11, mvp-scope §2) not built yet. `related` and `handoff`
 * may reference them; pages link only to tools that are live.
 */
export const PLANNED_SLUGS: readonly string[] = [
  "split-pdf",
  "organize-pdf",
  "jpg-to-pdf",
  "pdf-to-jpg",
  "sign-pdf",
  "compress-image",
  "convert-image",
  "resize-image",
  "remove-exif-data",
  "jwt-decoder",
  "diff-checker",
  "regex-tester",
  "uuid-generator",
  "hash-generator",
];

export const REGISTRY_CONTEXT: RegistryContext = {
  detectorIds: detectorIds(),
  plannedSlugs: PLANNED_SLUGS,
};

assertValidRegistry(TOOLS, REGISTRY_CONTEXT);

export const CATEGORIES: Record<
  ToolCategory,
  { name: string; href: string; applicationCategory: string }
> = {
  pdf: { name: "PDF tools", href: "/pdf-tools", applicationCategory: "UtilitiesApplication" },
  image: {
    name: "Image tools",
    href: "/image-tools",
    applicationCategory: "MultimediaApplication",
  },
  developer: {
    name: "Developer tools",
    href: "/developer-tools",
    applicationCategory: "DeveloperApplication",
  },
};

/** Built and listed tools (tool-registry §2: only "live" and "beta"). */
export function publishedTools(tools: readonly ToolDefinition[] = TOOLS): ToolDefinition[] {
  return tools.filter((tool) => tool.status === "live" || tool.status === "beta");
}

export function getTool(slug: string): ToolDefinition | undefined {
  return publishedTools().find((tool) => tool.slug === slug);
}

/** Related tools that have a page; unbuilt targets are skipped. */
export function relatedTools(
  tool: ToolDefinition,
  tools: readonly ToolDefinition[] = TOOLS,
): ToolDefinition[] {
  const published = publishedTools(tools);
  return tool.related.flatMap((slug) => published.find((t) => t.slug === slug) ?? []);
}
