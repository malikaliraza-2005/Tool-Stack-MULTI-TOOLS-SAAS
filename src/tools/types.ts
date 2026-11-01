// Tool registry types (tool-registry §2). `schema.ts` mirrors these with Zod.

export type ToolCategory = "pdf" | "image" | "developer";
export type ToolStatus = "live" | "beta" | "planned" | "hidden";

export type DeviceLimits = { softBytes: number; hardBytes: number; maxFiles?: number };

export type ToolLimits = {
  desktop: DeviceLimits;
  mobile: DeviceLimits;
  /**
   * Whether the byte limits apply to each file or to all files together.
   * PDF tools limit the total (mvp-scope §4); default "file".
   */
  per?: "file" | "total";
};

export type ToolFaq = { q: string; a: string };

export interface ToolDefinition {
  /** URL segment, kebab-case, permanent once indexed. Must not collide with reserved routes. */
  slug: string;
  category: ToolCategory;
  /** Only "live" and "beta" are built and listed. */
  status: ToolStatus;

  /** Display */
  name: string;
  /** For tight UI (palette, breadcrumbs). */
  shortName?: string;
  /** One sentence under the H1. */
  tagline: string;
  /** Lucide icon name or custom glyph id. */
  icon: string;

  /** Synonyms users might type: "combine pdf", "join pdf". */
  keywords: string[];

  /** SEO: used by generateMetadata, JSON-LD and the page. */
  seo: {
    /** ≤ 65 chars, unique. */
    title: string;
    /** 70–160 chars, unique. */
    description: string;
    /** Unique. */
    h1: string;
    /** Rendered visibly on the page; feeds FAQPage JSON-LD. */
    faqs: ToolFaq[];
    /** Generated (app/[tool]/opengraph-image.tsx) if omitted. */
    ogImage?: string;
  };

  /** Internal linking: 3–5 slugs recommended; must be registered or planned. */
  related: string[];

  /** Inputs: DropZone suggestions, file pickers, smart paste. */
  input: {
    kind: "files" | "text" | "both";
    accepts?: { mime: string[]; extensions: string[]; multiple: boolean };
    /** Ids of smart-paste detectors in src/lib/detect. */
    detect?: string[];
  };

  /** Enforced before processing (mvp-scope §4). */
  limits: ToolLimits;

  /** Processing facts, shown in UI and checked by tests. */
  processing: {
    /** Literal true: non-local tools are not allowed in the MVP. */
    local: true;
    worker: boolean;
    /** Works offline (G-5): pages after the first visit, file tools after their first use. */
    offline: boolean;
  };

  /** Hand-off targets for "Use in another tool". */
  handoff?: string[];

  /** ISO dates; `updatedAt` is the sitemap lastModified. */
  addedAt: string;
  updatedAt: string;
}
