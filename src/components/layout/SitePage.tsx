import type { ReactNode } from "react";
import { JsonLd } from "@/components/tool/JsonLd";
import { SITE_NAME } from "@/config/site";
import { sitePageJsonLd, type SitePageSeo } from "@/lib/seo";
import { Breadcrumbs } from "./Breadcrumbs";
import { Container } from "./Container";

/** "2026-11-02" → "November 2, 2026" (fixed locale and zone: rendered at build time). */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** Layout of the site pages (About, Privacy, Terms): breadcrumbs, H1, intro, sections. */
export function SitePage({
  page,
  h1,
  intro,
  children,
}: {
  page: SitePageSeo;
  h1: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <JsonLd data={sitePageJsonLd(page)} />
      <Container size="content" className="flex flex-col gap-10 pt-6 pb-(--section-gap) md:pt-8">
        <div className="flex flex-col gap-6">
          <Breadcrumbs items={[{ label: SITE_NAME, href: "/" }, { label: page.name }]} />
          <header className="flex flex-col gap-3">
            <h1 className="text-h1 text-fg">{h1}</h1>
            <p className="max-w-prose text-body-lg text-fg-muted">{intro}</p>
            {page.updated && (
              <p className="text-small text-fg-muted">
                Last updated <time dateTime={page.updated}>{formatDate(page.updated)}</time>
              </p>
            )}
          </header>
        </div>
        {children}
      </Container>
    </>
  );
}
