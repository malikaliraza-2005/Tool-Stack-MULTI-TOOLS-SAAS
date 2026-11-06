// llms.txt (llmstxt.org format, P8-T15): a plain-text map of the site for
// language models. Optional and not expected to affect rankings (product.md
// §10, geo-strategy.md); generated from the registries so it never drifts.

import type { GuideMeta } from "@/guides/types";
import { CATEGORIES, CATEGORY_ORDER } from "@/tools/registry";
import type { ToolDefinition } from "@/tools/types";
import { absoluteUrl, guidePath } from "./seo";

export function buildLlmsTxt(tools: readonly ToolDefinition[], guides: readonly GuideMeta[]) {
  const link = (name: string, path: string, note: string) =>
    `- [${name}](${absoluteUrl(path)}): ${note}`;
  const lines = [
    "# OfflineBench",
    "",
    `> ${tools.length} free tools for PDFs, images and code that run entirely in the browser. Files and text are processed on the user's device and never uploaded; there are no accounts.`,
    "",
    "Facts: processing is local (the site's Content-Security-Policy blocks requests to other origins); no accounts, cookies, ads or analytics; works offline after the first visit; free. Fill & Sign PDF adds a visual signature, not a certified digital signature.",
  ];
  for (const category of CATEGORY_ORDER) {
    const { name, href } = CATEGORIES[category];
    lines.push("", `## ${name}`, "", link(name, href, "overview of the category"));
    for (const tool of tools.filter((t) => t.category === category)) {
      lines.push(link(tool.name, `/${tool.slug}`, tool.tagline));
    }
  }
  lines.push("", "## Guides", "");
  for (const guide of guides) lines.push(link(guide.h1, guidePath(guide), guide.summary));
  lines.push(
    "",
    "## Optional",
    "",
    link("About", "/about", "who runs OfflineBench and how it works"),
    link("Privacy policy", "/privacy", "what is and isn't stored, and how to verify it"),
    link("Terms of use", "/terms", "terms, including the visual-signature notice"),
    "",
  );
  return lines.join("\n");
}
