// Search index for the command palette (tool-registry §4, G-1). Generated from
// the registry at build time (`app/search-index.json/route.ts`) and fetched
// when the palette opens, so the palette never imports the registry (its SEO
// text and FAQs would weigh down every page). This module must not import
// the registry either: the palette imports SEARCH_OPTIONS from it.

import type Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import type { ToolCategory, ToolDefinition } from "./types";

export type SearchEntry = {
  slug: string;
  name: string;
  shortName?: string;
  tagline: string;
  category: ToolCategory;
  icon: string;
  keywords: string[];
  /** Accepted file extensions without the dot ("pdf", "heic"), so file types are searchable. */
  formats: string[];
};

export function buildSearchIndex(tools: readonly ToolDefinition[]): SearchEntry[] {
  return tools.map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    ...(tool.shortName ? { shortName: tool.shortName } : {}),
    tagline: tool.tagline,
    category: tool.category,
    icon: tool.icon,
    keywords: tool.keywords,
    formats: (tool.input.accepts?.extensions ?? []).map((extension) => extension.slice(1)),
  }));
}

/** Fuse.js settings for the palette; search-index.test.ts checks every tool is found. */
export const SEARCH_OPTIONS: IFuseOptions<SearchEntry> = {
  keys: [
    { name: "name", weight: 3 },
    { name: "shortName", weight: 2 },
    { name: "keywords", weight: 2 },
    { name: "formats", weight: 1.5 },
    { name: "tagline", weight: 0.5 },
  ],
  threshold: 0.25,
  ignoreLocation: true,
  includeScore: true,
};

/** Weaker matches (scores near 1) are noise, such as "Hash Generator" for "heic". */
const MAX_SCORE = 0.5;

/** Best matches first; used by the command palette and the homepage search. */
export function searchTools<T extends SearchEntry>(
  fuse: Fuse<T>,
  query: string,
  limit: number,
): T[] {
  return fuse
    .search(query, { limit })
    .filter((result) => (result.score ?? 0) <= MAX_SCORE)
    .map((result) => result.item);
}
