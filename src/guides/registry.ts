// Published guides, newest first (content-strategy.md). registry.test.ts checks
// SEO lengths, uniqueness against every other page, dates, tools and sources.

import HeicVsJpg, { meta as heicVsJpg } from "./heic-vs-jpg";
import RemoveLocationFromPhotos, {
  meta as removeLocationFromPhotos,
} from "./remove-location-from-photos";
import type { Guide } from "./types";
import WhatIsInsideAJwt, { meta as whatIsInsideAJwt } from "./what-is-inside-a-jwt";

export const GUIDES: readonly Guide[] = [
  { meta: removeLocationFromPhotos, Content: RemoveLocationFromPhotos },
  { meta: whatIsInsideAJwt, Content: WhatIsInsideAJwt },
  { meta: heicVsJpg, Content: HeicVsJpg },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.meta.slug === slug);
}

/** Guides whose main tool (the first listed) is one of `slugs`, for the hubs. */
export function guidesForTools(slugs: readonly string[]): Guide[] {
  return GUIDES.filter((guide) => slugs.includes(guide.meta.tools[0]!));
}
