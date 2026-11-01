import { describe, expect, it } from "vitest";
import { CATEGORY_ORDER } from "./categories";
import { HUBS } from "./hubs";
import { publishedTools, TOOLS } from "./registry";

describe("category hubs (G-8)", () => {
  it.each(CATEGORY_ORDER)("%s hub has SEO text within the registry limits", (category) => {
    const { seo } = HUBS[category];
    expect(seo.title.length).toBeLessThanOrEqual(65);
    expect(seo.description.length).toBeGreaterThanOrEqual(70);
    expect(seo.description.length).toBeLessThanOrEqual(160);
  });

  it("uses titles and descriptions no tool uses", () => {
    const hubs = Object.values(HUBS);
    const taken = new Set(TOOLS.flatMap((tool) => [tool.seo.title, tool.seo.description]));
    for (const hub of hubs) {
      expect(taken.has(hub.seo.title)).toBe(false);
      expect(taken.has(hub.seo.description)).toBe(false);
    }
    expect(new Set(hubs.map((hub) => hub.seo.title)).size).toBe(hubs.length);
  });

  it.each(CATEGORY_ORDER)("%s hub guides point at its published tools", (category) => {
    for (const guide of HUBS[category].guides) {
      const tool = publishedTools().find((t) => t.slug === guide.slug);
      expect(tool?.category, guide.slug).toBe(category);
    }
  });
});
