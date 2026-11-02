import { describe, expect, it } from "vitest";
import { TOOL_ICONS } from "@/components/tool/ToolIcon";
import { publishedTools } from "./registry";
import Fuse from "fuse.js";
import { buildSearchIndex, SEARCH_OPTIONS, searchTools } from "./search-index";

describe("search index (G-1)", () => {
  const index = buildSearchIndex(publishedTools());

  it("lists every published tool with its synonyms", () => {
    expect(index.map((entry) => entry.slug)).toEqual(publishedTools().map((tool) => tool.slug));
    for (const entry of index) expect(entry.keywords.length).toBeGreaterThan(0);
  });

  it("makes accepted file types searchable", () => {
    const convert = index.find((entry) => entry.slug === "convert-image");
    expect(convert?.formats).toContain("heic");
  });

  it("carries no SEO text or FAQs", () => {
    expect(JSON.stringify(index)).not.toMatch(/"faqs"|"seo"/);
  });

  it("has an icon component for every tool", () => {
    for (const tool of publishedTools()) expect(TOOL_ICONS[tool.icon], tool.slug).toBeDefined();
  });
});

describe("palette search (Phase 7 exit criterion)", () => {
  const index = buildSearchIndex(publishedTools());
  const fuse = new Fuse(index, SEARCH_OPTIONS);
  const top = (query: string) => searchTools(fuse, query, 3).map((entry) => entry.slug);

  it.each(index.map((entry) => [entry.slug, entry] as const))(
    "finds %s by name and by a synonym",
    (slug, entry) => {
      expect(top(entry.name)[0]).toBe(slug);
      expect(entry.keywords.some((keyword) => top(keyword).includes(slug))).toBe(true);
    },
  );

  it("leaves out weak fuzzy matches", () => {
    expect(top("heic").sort()).toEqual(["convert-image", "jpg-to-pdf"]);
  });

  it("finds tools by file type", () => {
    expect(top("heic")).toContain("convert-image");
    expect(top("pdf")).toContain("merge-pdf");
  });
});
