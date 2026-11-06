import { describe, expect, it } from "vitest";
import { GUIDES } from "@/guides/registry";
import { publishedTools } from "@/tools/registry";
import { buildLlmsTxt } from "./llms";
import { absoluteUrl } from "./seo";

describe("llms.txt", () => {
  const text = buildLlmsTxt(
    publishedTools(),
    GUIDES.map((guide) => guide.meta),
  );

  it("starts with the llmstxt.org title and summary", () => {
    const [title, , summary] = text.split("\n");
    expect(title).toBe("# OfflineBench");
    expect(summary).toMatch(/^> 19 free tools/);
  });

  it("links every published tool and guide with an absolute URL", () => {
    for (const tool of publishedTools()) {
      expect(text).toContain(`(${absoluteUrl(`/${tool.slug}`)}): ${tool.tagline}`);
    }
    for (const { meta } of GUIDES) {
      expect(text).toContain(`(${absoluteUrl(`/guides/${meta.slug}`)})`);
    }
  });
});
