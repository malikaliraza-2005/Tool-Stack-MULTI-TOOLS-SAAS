import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ToolDefinition } from "@/tools/types";

/** Related tools from the registry; only tools that have a page are listed. */
export function RelatedTools({ tools }: { tools: ToolDefinition[] }) {
  if (tools.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-4">
      <h2 id="related-heading" className="text-h2 text-fg">
        Related tools
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link
              href={`/${tool.slug}`}
              className="group flex h-full flex-col gap-1 rounded-lg border border-border bg-surface p-4 transition-control hover:border-border-strong"
            >
              <span className="inline-flex items-center gap-2 text-ui text-fg">
                {tool.name}
                <ArrowRight
                  aria-hidden
                  className="size-4 text-fg-muted transition-control group-hover:translate-x-0.5"
                />
              </span>
              <span className="text-small text-fg-muted">{tool.tagline}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
