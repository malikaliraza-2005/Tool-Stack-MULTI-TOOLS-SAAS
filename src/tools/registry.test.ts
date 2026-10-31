import { describe, expect, it } from "vitest";
import {
  getTool,
  PLANNED_SLUGS,
  publishedTools,
  REGISTRY_CONTEXT,
  relatedTools,
  TOOLS,
} from "./registry";
import type { ToolDefinition } from "./types";
import { assertValidRegistry, RegistryError, validateRegistry } from "./validate";

const MB = 2 ** 20;

/** A valid live tool; tests break one thing at a time. */
function tool(patch: Partial<ToolDefinition> = {}, n = 1): ToolDefinition {
  return {
    slug: `tool-${n}`,
    category: "developer",
    status: "live",
    name: `Tool ${n}`,
    tagline: "Does a thing in your browser.",
    icon: "braces",
    keywords: ["thing"],
    seo: {
      title: `Tool ${n}: does a thing | Sprigkit`,
      description: `Tool ${n} does a thing in your browser, privately, with nothing uploaded. Free, no sign-up, works on any device.`,
      h1: `Tool ${n}`,
      faqs: [
        { q: "Q1?", a: "A1." },
        { q: "Q2?", a: "A2." },
        { q: "Q3?", a: "A3." },
      ],
    },
    related: [],
    input: { kind: "text", detect: ["json"] },
    limits: {
      desktop: { softBytes: 5 * MB, hardBytes: 50 * MB },
      mobile: { softBytes: 5 * MB, hardBytes: 50 * MB },
    },
    processing: { local: true, worker: false, offline: false },
    addedAt: "2026-10-14",
    updatedAt: "2026-10-14",
    ...patch,
  };
}

const context = { detectorIds: ["json"], plannedSlugs: ["planned-tool"] };
const errorsFor = (tools: ToolDefinition[]) => validateRegistry(tools, context);

describe("the real registry", () => {
  it("is valid", () => {
    expect(validateRegistry(TOOLS, REGISTRY_CONTEXT)).toEqual([]);
  });

  it("contains the pilots as live tools", () => {
    expect(publishedTools().map((t) => t.slug)).toEqual([
      "merge-pdf",
      "json-formatter",
      "unix-timestamp-converter",
      "base64-encode-decode",
      "url-encode-decode",
      "uuid-generator",
    ]);
    expect(getTool("merge-pdf")?.name).toBe("Merge PDF");
    expect(getTool("split-pdf")).toBeUndefined();
  });

  it("does not list planned slugs as registered tools", () => {
    for (const slug of PLANNED_SLUGS) expect(TOOLS.some((t) => t.slug === slug)).toBe(false);
  });

  it("relatedTools returns only published tools", () => {
    const merge = getTool("merge-pdf")!;
    expect(relatedTools(merge)).toEqual([]);
    const withPilot = { ...merge, related: ["json-formatter", "split-pdf"] };
    expect(relatedTools(withPilot).map((t) => t.slug)).toEqual(["json-formatter"]);
  });
});

describe("validation rules (tool-registry §3)", () => {
  it("accepts a valid registry", () => {
    expect(errorsFor([tool({}, 1), tool({}, 2)])).toEqual([]);
  });

  it("schema: rejects wrong types and missing fields", () => {
    const broken = { ...tool(), category: "video" } as unknown as ToolDefinition;
    expect(errorsFor([broken])[0]).toMatch(/tool-1: category/);
    const noName = { ...tool(), name: "" };
    expect(errorsFor([noName])[0]).toMatch(/name/);
  });

  it("rule 1: slug is kebab-case, unique and not reserved", () => {
    expect(errorsFor([tool({ slug: "Merge_PDF" })])[0]).toMatch(/kebab-case/);
    const dupes = errorsFor([
      tool({}, 1),
      tool({ slug: "tool-1", seo: tool({}, 2).seo, name: "B" }, 2),
    ]);
    expect(dupes).toContain("tool-1: slug is used by more than one tool");
    expect(errorsFor([tool({ slug: "privacy" })])).toContain("privacy: slug is reserved");
    expect(errorsFor([tool({ slug: "pdf-tools" })])).toContain("pdf-tools: slug is reserved");
  });

  it("rule 2: seo title, description and h1 are unique (case-insensitive)", () => {
    const a = tool({}, 1);
    const b = tool({ seo: { ...tool({}, 2).seo, title: a.seo.title.toUpperCase() } }, 2);
    expect(errorsFor([a, b])).toEqual(["tool-2: seo.title duplicates tool-1"]);
    const c = tool({ seo: { ...tool({}, 2).seo, h1: a.seo.h1 } }, 2);
    expect(errorsFor([a, c])).toEqual(["tool-2: seo.h1 duplicates tool-1"]);
    const d = tool({ seo: { ...tool({}, 2).seo, description: a.seo.description } }, 2);
    expect(errorsFor([a, d])).toEqual(["tool-2: seo.description duplicates tool-1"]);
  });

  it("rule 3: title ≤ 65, description 70–160 characters", () => {
    const base = tool();
    expect(errorsFor([tool({ seo: { ...base.seo, title: "x".repeat(66) } })])[0]).toMatch(
      /seo.title is 66 characters/,
    );
    expect(errorsFor([tool({ seo: { ...base.seo, description: "x".repeat(69) } })])[0]).toMatch(
      /seo.description is 69 characters/,
    );
    expect(errorsFor([tool({ seo: { ...base.seo, description: "x".repeat(161) } })])[0]).toMatch(
      /seo.description is 161 characters/,
    );
  });

  it("rule 4: related and handoff targets exist (registered or planned) and are not self", () => {
    expect(errorsFor([tool({ related: ["planned-tool"], handoff: ["planned-tool"] })])).toEqual([]);
    expect(errorsFor([tool({ related: ["nope"] })])).toEqual([
      'tool-1: related target "nope" not found',
    ]);
    expect(errorsFor([tool({ handoff: ["tool-1"] })])).toEqual([
      "tool-1: handoff lists the tool itself",
    ]);
  });

  it("rule 5: file tools declare accepts; detectors exist", () => {
    expect(errorsFor([tool({ input: { kind: "files" } })])).toEqual([
      'tool-1: input.accepts is required for kind "files"',
    ]);
    expect(errorsFor([tool({ input: { kind: "text", detect: ["jwt"] } })])).toEqual([
      'tool-1: detector "jwt" does not exist',
    ]);
  });

  it("rule 6: mobile limits never exceed desktop limits", () => {
    const limits = {
      desktop: { softBytes: 5 * MB, hardBytes: 50 * MB, maxFiles: 10 },
      mobile: { softBytes: 5 * MB, hardBytes: 60 * MB, maxFiles: 20 },
    };
    expect(errorsFor([tool({ limits })])).toEqual([
      "tool-1: limits.mobile.hardBytes (62914560) exceeds limits.desktop.hardBytes (52428800)",
      "tool-1: limits.mobile.maxFiles (20) exceeds limits.desktop.maxFiles (10)",
    ]);
  });

  it("rule 7: processing.local must be true", () => {
    const remote = tool({ processing: { local: false, worker: false, offline: false } as never });
    expect(errorsFor([remote])[0]).toMatch(/processing.local/);
  });

  it("rule 8: live tools have at least 3 FAQs; planned tools may have none", () => {
    const base = tool();
    const fewFaqs = { ...base.seo, faqs: base.seo.faqs.slice(0, 2) };
    expect(errorsFor([tool({ seo: fewFaqs })])).toEqual([
      "tool-1: live tools need at least 3 FAQs (has 2)",
    ]);
    expect(errorsFor([tool({ status: "planned", seo: { ...base.seo, faqs: [] } })])).toEqual([]);
  });

  it("dates are ISO and updatedAt is not before addedAt", () => {
    expect(errorsFor([tool({ addedAt: "14/10/2026" })])[0]).toMatch(/ISO date/);
    expect(errorsFor([tool({ updatedAt: "2026-10-01" })])).toEqual([
      "tool-1: updatedAt is before addedAt",
    ]);
  });

  it("assertValidRegistry throws (failing the build) on a deliberately broken entry", () => {
    const broken = tool({ related: ["does-not-exist"], slug: "about" });
    expect(() => assertValidRegistry([broken], context)).toThrow(RegistryError);
    expect(() => assertValidRegistry([broken], context)).toThrow(
      /about: slug is reserved[\s\S]*about: related target "does-not-exist" not found/,
    );
  });
});
