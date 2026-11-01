// The tool registry: single source of truth for every tool (tool-registry.md).
// Validated when this module loads; pages, metadata and the sitemap import it
// at build time, so an invalid entry fails the build.

import { detectorIds } from "@/lib/detect";
import { meta as base64EncodeDecode } from "./base64-encode-decode/meta";
import { meta as jsonFormatter } from "./json-formatter/meta";
import { meta as mergePdf } from "./merge-pdf/meta";
import { meta as unixTimestampConverter } from "./unix-timestamp-converter/meta";
import { meta as urlEncodeDecode } from "./url-encode-decode/meta";
import { meta as uuidGenerator } from "./uuid-generator/meta";
import { meta as hashGenerator } from "./hash-generator/meta";
import { meta as jwtDecoder } from "./jwt-decoder/meta";
import { meta as diffChecker } from "./diff-checker/meta";
import { meta as regexTester } from "./regex-tester/meta";
import { meta as splitPdf } from "./split-pdf/meta";
import { meta as organizePdf } from "./organize-pdf/meta";
import { meta as jpgToPdf } from "./jpg-to-pdf/meta";
import { meta as pdfToJpg } from "./pdf-to-jpg/meta";
import { meta as signPdf } from "./sign-pdf/meta";
import { meta as removeExifData } from "./remove-exif-data/meta";
import { meta as compressImage } from "./compress-image/meta";
import { meta as resizeImage } from "./resize-image/meta";
import { meta as convertImage } from "./convert-image/meta";
import type { ToolCategory, ToolDefinition } from "./types";
import { assertValidRegistry, type RegistryContext } from "./validate";

export const TOOLS: readonly ToolDefinition[] = [
  mergePdf,
  jsonFormatter,
  unixTimestampConverter,
  base64EncodeDecode,
  urlEncodeDecode,
  uuidGenerator,
  hashGenerator,
  jwtDecoder,
  diffChecker,
  regexTester,
  splitPdf,
  organizePdf,
  jpgToPdf,
  pdfToJpg,
  signPdf,
  removeExifData,
  compressImage,
  resizeImage,
  convertImage,
];

/**
 * Final MVP slugs (D-11, mvp-scope §2) not built yet. `related` and `handoff`
 * may reference them; pages link only to tools that are live.
 */
export const PLANNED_SLUGS: readonly string[] = [];

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
