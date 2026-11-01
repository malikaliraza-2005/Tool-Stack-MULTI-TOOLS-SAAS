import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_ORDER } from "@/tools/categories";
import type { ToolDefinition } from "@/tools/types";
import { firstSentence } from "./summary";

/**
 * The index (design-system §1, §10.1): every tool in three columns, typeset
 * like a table of contents rather than a grid of identical cards. Each row
 * is one link, so Tab walks the list in reading order.
 */
export function ToolIndex({ tools }: { tools: ToolDefinition[] }) {
  return (
    <section aria-labelledby="index-heading" className="flex flex-col gap-8">
      <h2 id="index-heading" className="text-h2 text-fg">
        All tools
      </h2>
      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-3">
        {CATEGORY_ORDER.map((category) => {
          const listed = tools.filter((tool) => tool.category === category);
          const { name, href } = CATEGORIES[category];
          const headingId = `index-${category}`;
          return (
            <section key={category} aria-labelledby={headingId} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-3 border-b border-fg pb-2">
                <h3 id={headingId} className="text-micro text-fg uppercase">
                  {name}
                </h3>
                <span className="font-mono text-small text-fg-muted tabular-nums">
                  {String(listed.length).padStart(2, "0")}
                </span>
              </div>
              <ol>
                {listed.map((tool, index) => (
                  <li key={tool.slug} className="border-b border-border">
                    <Link
                      href={`/${tool.slug}`}
                      className="group grid grid-cols-[auto_1fr] gap-x-4 rounded-sm py-3 transition-control hover:bg-surface-2 focus-visible:bg-surface-2"
                    >
                      <span
                        aria-hidden
                        className="pt-0.5 font-mono text-small text-fg-subtle tabular-nums"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-ui text-fg group-hover:text-accent-text">
                          {tool.name}
                        </span>
                        <span className="text-small text-fg-muted">
                          {firstSentence(tool.tagline)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link
                href={href}
                className="mt-3 inline-flex items-center gap-1.5 self-start rounded-sm text-ui text-accent-text hover:underline"
              >
                All {name}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </section>
          );
        })}
      </div>
    </section>
  );
}
