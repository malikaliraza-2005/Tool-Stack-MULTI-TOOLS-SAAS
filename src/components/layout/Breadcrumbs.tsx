import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type Crumb = { label: string; href?: string };

/** Last item is the current page and is not a link. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-small text-fg-muted">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {item.href && !current ? (
                <Link
                  href={item.href}
                  // Hub pages arrive in Phase 7; no prefetch of pages that may not exist yet.
                  prefetch={false}
                  className="rounded-sm underline-offset-4 transition-control hover:text-fg hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={cn(current && "text-fg")}
                >
                  {item.label}
                </span>
              )}
              {!current && <ChevronRight aria-hidden className="size-3.5 text-fg-subtle" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
