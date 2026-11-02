import { describe, expect, it } from "vitest";
import { HOME_SEO } from "@/components/home/home-content";
import { HUBS } from "@/tools/hubs";
import { publishedTools, TOOLS } from "@/tools/registry";
import { GUIDES } from "./registry";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe.each(GUIDES.map((guide) => [guide.meta.slug, guide.meta] as const))(
  "guide %s",
  (_, meta) => {
    it("has SEO text within the site limits", () => {
      expect(meta.title.length).toBeLessThanOrEqual(65);
      expect(meta.title).toMatch(/ \| Sprigkit$/);
      expect(meta.description.length).toBeGreaterThanOrEqual(70);
      expect(meta.description.length).toBeLessThanOrEqual(160);
      expect(meta.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    it("is dated, with updated on or after published", () => {
      expect(meta.published).toMatch(ISO_DATE);
      expect(meta.updated).toMatch(ISO_DATE);
      expect(meta.updated >= meta.published).toBe(true);
    });

    it("links only to published tools", () => {
      const live = new Set(publishedTools().map((tool) => tool.slug));
      expect(meta.tools.length).toBeGreaterThan(0);
      for (const slug of meta.tools) expect(live.has(slug), slug).toBe(true);
    });

    it("cites at least one https source", () => {
      expect(meta.sources.length).toBeGreaterThan(0);
      for (const source of meta.sources) expect(source.url).toMatch(/^https:\/\//);
    });
  },
);

describe("guides", () => {
  it("use slugs, titles, descriptions and H1s no other page uses", () => {
    const taken = new Set([
      HOME_SEO.title,
      HOME_SEO.description,
      ...TOOLS.flatMap((tool) => [tool.seo.title, tool.seo.description, tool.seo.h1]),
      ...Object.values(HUBS).flatMap((hub) => [hub.seo.title, hub.seo.description, hub.h1]),
    ]);
    const own = GUIDES.flatMap(({ meta }) => [meta.slug, meta.title, meta.description, meta.h1]);
    for (const value of own) expect(taken.has(value), value).toBe(false);
    expect(new Set(own).size).toBe(own.length);
  });
});
