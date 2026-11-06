// Guide definitions (content-strategy.md, P8-T11). Like the tool registry, the
// meta drives the page, metadata, JSON-LD, sitemap and guide links.

import type { ComponentType } from "react";

export type GuideSource = { title: string; publisher: string; url: string };

export interface GuideMeta {
  /** URL segment under /guides, kebab-case, permanent once indexed. */
  slug: string;
  /** ≤ 65 chars, ends with "| KeptLocal", unique across the site. */
  title: string;
  /** 70–160 chars, unique. */
  description: string;
  /** The question or task, sentence case. */
  h1: string;
  /** One or two sentences under the H1 and on the guide index. */
  summary: string;
  author: string;
  /** ISO dates, visible on the page and in Article JSON-LD. */
  published: string;
  updated: string;
  /**
   * Published tools the guide uses; linked from the guide and the hubs. The
   * first is its main tool: the hub shows this guide instead of that tool's
   * short "How to use" link.
   */
  tools: string[];
  /** Every external fact is backed by one of these (content-strategy §4). */
  sources: GuideSource[];
}

export type Guide = { meta: GuideMeta; Content: ComponentType };
