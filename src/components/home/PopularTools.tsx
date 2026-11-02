import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ToolDefinition } from "@/tools/types";
import { firstSentence } from "./summary";

/** Curated row (design-system §10.1): the jobs most people come for. */
export const POPULAR_SLUGS = ["merge-pdf", "compress-image", "convert-image", "json-formatter"];

/**
 * Mini previews show what the tool does, drawn with tokens. They are
 * illustrations, not results, so they carry no invented numbers.
 */
const PREVIEWS: Record<string, ReactNode> = {
  "merge-pdf": (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-5">
        {[0, 1, 2].map((page) => (
          <span
            key={page}
            className="h-14 w-11 rounded-sm border border-border-strong bg-surface"
          />
        ))}
      </div>
      <ArrowRight className="size-4 text-fg-subtle" />
      <span className="flex h-14 w-11 items-end justify-center rounded-sm border border-accent bg-surface pb-1 font-mono text-micro text-accent-text">
        PDF
      </span>
    </div>
  ),
  "compress-image": (
    <div className="flex w-full max-w-44 flex-col gap-2">
      <div className="flex justify-between font-mono text-micro text-fg-muted">
        <span>Quality</span>
        <span className="tabular-nums">80</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-3">
        <span className="absolute inset-y-0 left-0 w-4/5 rounded-full bg-accent" />
        <span className="absolute top-1/2 left-4/5 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border-strong bg-surface shadow-1" />
      </div>
    </div>
  ),
  "convert-image": (
    <div className="flex items-center gap-3 font-mono text-ui">
      <span className="rounded-sm border border-border-strong bg-surface px-2 py-1 text-fg">
        HEIC
      </span>
      <ArrowRight className="size-4 text-fg-subtle" />
      <span className="rounded-sm border border-accent bg-surface px-2 py-1 text-accent-text">
        JPG
      </span>
    </div>
  ),
  "json-formatter": (
    <pre className="font-mono text-small text-fg-muted">
      {"{\n  "}
      <span className="text-accent-text">&quot;private&quot;</span>
      {": "}
      <span className="text-fg">true</span>
      {"\n}"}
    </pre>
  ),
};

export function PopularTools({ tools }: { tools: ToolDefinition[] }) {
  const popular = POPULAR_SLUGS.flatMap((slug) => tools.find((tool) => tool.slug === slug) ?? []);
  if (popular.length === 0) return null;
  return (
    <section aria-labelledby="popular-heading" className="flex flex-col gap-6">
      <h2 id="popular-heading" className="text-h2 text-fg">
        Popular tools
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {popular.map((tool) => (
          <li key={tool.slug}>
            <Link
              href={`/${tool.slug}`}
              className="group flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-1 transition-control hover:border-border-strong"
            >
              <div
                aria-hidden
                className="flex h-28 items-center justify-center rounded-md border border-border bg-surface-2"
              >
                {PREVIEWS[tool.slug]}
              </div>
              <span className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-2 text-ui text-fg">
                  {tool.name}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-fg-muted transition-control group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-small text-fg-muted">{firstSentence(tool.tagline)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
