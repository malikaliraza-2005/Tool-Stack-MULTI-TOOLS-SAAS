import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/tool/JsonLd";
import { PrivacyMeter } from "@/components/tool/PrivacyMeter";
import { ToolIcon } from "@/components/tool/ToolIcon";
import { SITE_NAME } from "@/config/site";
import { hubJsonLd } from "@/lib/seo";
import { HUBS } from "@/tools/hubs";
import { CATEGORIES, CATEGORY_ORDER, publishedTools } from "@/tools/registry";
import type { ToolCategory } from "@/tools/types";
import { firstSentence } from "./summary";

/**
 * Category hub (G-8, architecture §5): intro, every tool of the category
 * from the registry, short guide links and the other hubs.
 */
export function CategoryHub({ category }: { category: ToolCategory }) {
  const hub = HUBS[category];
  const { name } = CATEGORIES[category];
  const tools = publishedTools().filter((tool) => tool.category === category);
  const others = CATEGORY_ORDER.filter((other) => other !== category);

  return (
    <>
      <JsonLd data={hubJsonLd(category, tools)} />
      <Container className="section-stack pt-6 pb-(--section-gap) md:pt-8">
        <div className="flex flex-col gap-6">
          <Breadcrumbs items={[{ label: SITE_NAME, href: "/" }, { label: name }]} />
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-h1 text-fg">{hub.h1}</h1>
              <p className="max-w-prose text-body-lg text-fg-muted">{hub.intro}</p>
            </div>
            {/* /privacy is built in Phase 8; it explains the same guarantee. */}
            <PrivacyMeter href="/privacy" className="self-start md:self-auto" />
          </header>
        </div>

        <section aria-labelledby="hub-tools" className="flex flex-col gap-4">
          <h2 id="hub-tools" className="text-h2 text-fg">
            {tools.length} {name}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/${tool.slug}`}
                  className="group flex h-full gap-4 rounded-lg border border-border bg-surface p-4 shadow-1 transition-control hover:border-border-strong"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted">
                    <ToolIcon name={tool.icon} className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-2 text-ui text-fg">
                      {tool.name}
                      <ArrowRight
                        aria-hidden
                        className="size-4 text-fg-muted transition-control group-hover:translate-x-0.5"
                      />
                    </span>
                    <span className="text-small text-fg-muted">{tool.tagline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-12 lg:grid-cols-2">
          <section aria-labelledby="hub-guides" className="flex flex-col gap-4">
            <h2 id="hub-guides" className="text-h2 text-fg">
              Guides
            </h2>
            <ul className="flex flex-col border-t border-border">
              {hub.guides.map((guide) => (
                <li key={guide.slug} className="border-b border-border">
                  <Link
                    href={`/${guide.slug}#how-to`}
                    className="flex items-center gap-3 rounded-sm py-3 text-ui text-fg transition-control hover:bg-surface-2 hover:text-accent-text"
                  >
                    <BookOpen aria-hidden className="size-4 shrink-0 text-fg-muted" />
                    {guide.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="hub-others" className="flex flex-col gap-4">
            <h2 id="hub-others" className="text-h2 text-fg">
              More tools
            </h2>
            <ul className="flex flex-col border-t border-border">
              {others.map((other) => (
                <li key={other} className="border-b border-border">
                  <Link
                    href={CATEGORIES[other].href}
                    className="flex items-center justify-between gap-3 rounded-sm py-3 transition-control hover:bg-surface-2"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-ui text-fg">{CATEGORIES[other].name}</span>
                      <span className="text-small text-fg-muted">
                        {firstSentence(HUBS[other].intro)}
                      </span>
                    </span>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>
    </>
  );
}
