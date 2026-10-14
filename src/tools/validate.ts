// Registry validation rules (tool-registry §3). `assertValidRegistry` runs at
// build time (generateStaticParams, sitemap), so any violation fails the build.

import { toolSchema } from "./schema";
import type { ToolDefinition } from "./types";

/**
 * URL segments a tool can never use: site routes, hubs, files in `public/`
 * and build output paths (architecture §5, information-architecture §2).
 */
export const RESERVED_SLUGS: readonly string[] = [
  "about",
  "privacy",
  "terms",
  "licenses",
  "guides",
  "pdf-tools",
  "image-tools",
  "developer-tools",
  "api",
  "_next",
  "_gallery",
  "og",
  "icons",
  "vendor",
  "serwist",
  "sitemap.xml",
  "robots.txt",
];

export type RegistryContext = {
  /** Ids of the smart-paste detectors in src/lib/detect. */
  detectorIds: readonly string[];
  /**
   * Final MVP slugs (D-11) that are not built yet. `related` and `handoff` may
   * point at them; pages only link to tools that are live.
   */
  plannedSlugs: readonly string[];
};

const TITLE_MAX = 65;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;
const MIN_FAQS_LIVE = 3;

/** Returns every rule violation as a readable message; empty when valid. */
export function validateRegistry(
  tools: readonly ToolDefinition[],
  context: RegistryContext,
): string[] {
  const errors: string[] = [];

  // Schema (types, kebab-case slug, processing.local === true, dates, …).
  tools.forEach((tool, index) => {
    const parsed = toolSchema.safeParse(tool);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const label = typeof tool?.slug === "string" ? tool.slug : `#${index}`;
        errors.push(`${label}: ${issue.path.join(".") || "entry"} ${issue.message}`);
      }
    }
  });
  if (errors.length > 0) return errors;

  const registered = new Set(tools.map((tool) => tool.slug));
  const known = new Set([...registered, ...context.plannedSlugs]);
  const detectors = new Set(context.detectorIds);

  // Rule 1: unique, not reserved.
  const seen = new Set<string>();
  for (const tool of tools) {
    if (seen.has(tool.slug)) errors.push(`${tool.slug}: slug is used by more than one tool`);
    seen.add(tool.slug);
    if (RESERVED_SLUGS.includes(tool.slug)) errors.push(`${tool.slug}: slug is reserved`);
  }

  // Rule 2: unique SEO fields across all tools.
  for (const field of ["title", "description", "h1"] as const) {
    const owners = new Map<string, string>();
    for (const tool of tools) {
      const value = tool.seo[field].trim().toLowerCase();
      const owner = owners.get(value);
      if (owner) errors.push(`${tool.slug}: seo.${field} duplicates ${owner}`);
      else owners.set(value, tool.slug);
    }
  }

  for (const tool of tools) {
    const { slug, seo } = tool;

    // Rule 3: lengths.
    if (seo.title.length > TITLE_MAX) {
      errors.push(`${slug}: seo.title is ${seo.title.length} characters (max ${TITLE_MAX})`);
    }
    if (seo.description.length < DESCRIPTION_MIN || seo.description.length > DESCRIPTION_MAX) {
      errors.push(
        `${slug}: seo.description is ${seo.description.length} characters (${DESCRIPTION_MIN}–${DESCRIPTION_MAX})`,
      );
    }

    // Rule 4: related and handoff targets exist and are not the tool itself.
    for (const field of ["related", "handoff"] as const) {
      for (const target of tool[field] ?? []) {
        if (target === slug) errors.push(`${slug}: ${field} lists the tool itself`);
        else if (!known.has(target)) errors.push(`${slug}: ${field} target "${target}" not found`);
      }
    }

    // Rule 5: file tools declare what they accept; detectors exist.
    if (tool.input.kind !== "text" && !tool.input.accepts) {
      errors.push(`${slug}: input.accepts is required for kind "${tool.input.kind}"`);
    }
    for (const id of tool.input.detect ?? []) {
      if (!detectors.has(id)) errors.push(`${slug}: detector "${id}" does not exist`);
    }

    // Rule 6: mobile limits never exceed desktop limits.
    const { desktop, mobile } = tool.limits;
    for (const key of ["softBytes", "hardBytes", "maxFiles"] as const) {
      const d = desktop[key];
      const m = mobile[key];
      if (d !== undefined && m !== undefined && m > d) {
        errors.push(`${slug}: limits.mobile.${key} (${m}) exceeds limits.desktop.${key} (${d})`);
      }
      if (d !== undefined && m === undefined) {
        errors.push(`${slug}: limits.mobile.${key} is missing but desktop has one`);
      }
    }

    // Rule 7 (processing.local === true) is enforced by the schema literal.

    // Rule 8: live tools have at least 3 FAQs.
    if (tool.status === "live" && seo.faqs.length < MIN_FAQS_LIVE) {
      errors.push(
        `${slug}: live tools need at least ${MIN_FAQS_LIVE} FAQs (has ${seo.faqs.length})`,
      );
    }

    if (tool.updatedAt < tool.addedAt) errors.push(`${slug}: updatedAt is before addedAt`);
  }

  return errors;
}

export class RegistryError extends Error {
  override readonly name = "RegistryError";
}

/** Throws (failing the build) when any rule is violated. */
export function assertValidRegistry(
  tools: readonly ToolDefinition[],
  context: RegistryContext,
): void {
  const errors = validateRegistry(tools, context);
  if (errors.length > 0) {
    throw new RegistryError(
      `Tool registry is invalid (tool-registry.md §3):\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
}
