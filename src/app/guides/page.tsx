import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/tool/JsonLd";
import { SITE_NAME } from "@/config/site";
import { GUIDES } from "@/guides/registry";
import { formatLongDate } from "@/lib/dates";
import { GUIDES_INDEX, guidePath, guidesIndexJsonLd, sitePageMetadata } from "@/lib/seo";

export const metadata: Metadata = sitePageMetadata({ ...GUIDES_INDEX, type: "WebPage" });

// Guide index (P8-T11): every guide, newest first as listed in the registry.
export default function GuidesIndex() {
  return (
    <>
      <JsonLd data={guidesIndexJsonLd(GUIDES.map((guide) => guide.meta))} />
      <Container size="content" className="flex flex-col gap-10 pt-6 pb-(--section-gap) md:pt-8">
        <div className="flex flex-col gap-6">
          <Breadcrumbs items={[{ label: SITE_NAME, href: "/" }, { label: GUIDES_INDEX.name }]} />
          <header className="flex flex-col gap-3">
            <h1 className="text-h1 text-fg">Guides</h1>
            <p className="max-w-prose text-body-lg text-fg-muted">
              Step-by-step answers to the jobs KeptLocal’s tools do, written from how the tools and
              file formats actually work, with sources.
            </p>
          </header>
        </div>
        <ul className="flex flex-col border-t border-border">
          {GUIDES.map(({ meta }) => (
            <li key={meta.slug} className="border-b border-border">
              <article className="flex flex-col gap-2 py-5">
                <h2 className="text-h3 text-fg">
                  <Link
                    href={guidePath(meta)}
                    className="rounded-sm transition-control hover:text-accent-text"
                  >
                    {meta.h1}
                  </Link>
                </h2>
                <p className="max-w-prose text-body text-fg-muted">{meta.summary}</p>
                <p className="text-small text-fg-muted">
                  <time dateTime={meta.updated}>{formatLongDate(meta.updated)}</time>
                </p>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
