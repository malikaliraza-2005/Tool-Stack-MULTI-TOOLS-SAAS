// Zod mirror of ToolDefinition (tool-registry §2), used at build time only.

import { z } from "zod";
import type { ToolDefinition } from "./types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)");
const nonEmpty = z.string().trim().min(1);

const deviceLimits = z
  .object({
    softBytes: z.number().int().positive(),
    hardBytes: z.number().int().positive(),
    maxFiles: z.number().int().positive().optional(),
  })
  .strict()
  .refine((limits) => limits.softBytes <= limits.hardBytes, "softBytes must be ≤ hardBytes");

export const toolSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case"),
    category: z.enum(["pdf", "image", "developer"]),
    status: z.enum(["live", "beta", "planned", "hidden"]),
    name: nonEmpty,
    shortName: nonEmpty.optional(),
    tagline: nonEmpty,
    icon: nonEmpty,
    keywords: z.array(nonEmpty).min(1),
    seo: z
      .object({
        title: nonEmpty,
        description: nonEmpty,
        h1: nonEmpty,
        faqs: z.array(z.object({ q: nonEmpty, a: nonEmpty }).strict()),
        ogImage: nonEmpty.optional(),
      })
      .strict(),
    related: z.array(z.string()),
    input: z
      .object({
        kind: z.enum(["files", "text", "both"]),
        accepts: z
          .object({
            mime: z.array(nonEmpty).min(1),
            extensions: z.array(z.string().regex(/^\.[a-z0-9]+$/, "must look like .ext")).min(1),
            multiple: z.boolean(),
          })
          .strict()
          .optional(),
        detect: z.array(nonEmpty).optional(),
      })
      .strict(),
    limits: z
      .object({
        desktop: deviceLimits,
        mobile: deviceLimits,
        per: z.enum(["file", "total"]).optional(),
      })
      .strict(),
    processing: z
      .object({ local: z.literal(true), worker: z.boolean(), offline: z.boolean() })
      .strict(),
    handoff: z.array(z.string()).optional(),
    addedAt: isoDate,
    updatedAt: isoDate,
  })
  .strict() satisfies z.ZodType<ToolDefinition>;
