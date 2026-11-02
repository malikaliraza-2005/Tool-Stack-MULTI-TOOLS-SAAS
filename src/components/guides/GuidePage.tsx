import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { TextLink } from "@/components/tool/content";
import { JsonLd } from "@/components/tool/JsonLd";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { SITE_NAME } from "@/config/site";
import type { Guide } from "@/guides/types";
import { formatLongDate } from "@/lib/dates";
import { GUIDES_INDEX, guideJsonLd } from "@/lib/seo";
import { getTool } from "@/tools/registry";

/** Guide template (P8-T11): byline with dates, the article, tools used and sources. */
export function GuidePage({ guide }: { guide: Guide }) {
  const { meta, Content } = guide;
  const tools = meta.tools.flatMap((slug) => getTool(slug) ?? []);
  return (
    <>
      <JsonLd data={guideJsonLd(meta)} />
      <Container size="content" className="flex flex-col gap-10 pt-6 pb-(--section-gap) md:pt-8">
        <div className="flex flex-col gap-6">
          <Breadcrumbs
            items={[
              { label: SITE_NAME, href: "/" },
              { label: GUIDES_INDEX.name, href: GUIDES_INDEX.path },
              { label: meta.h1 },
            ]}
          />
          <header className="flex flex-col gap-3">
            <h1 className="text-h1 text-fg">{meta.h1}</h1>
            <p className="max-w-prose text-body-lg text-fg-muted">{meta.summary}</p>
            <p className="text-small text-fg-muted">
              By <TextLink href="/about">{meta.author}</TextLink> · Published{" "}
              <time dateTime={meta.published}>{formatLongDate(meta.published)}</time>
              {meta.updated !== meta.published && (
                <>
                  {" "}
                  · Updated <time dateTime={meta.updated}>{formatLongDate(meta.updated)}</time>
                </>
              )}
            </p>
          </header>
        </div>

        <Content />

        <RelatedTools tools={tools} title="Tools used in this guide" />

        <section aria-labelledby="sources-heading" className="flex flex-col gap-4">
          <h2 id="sources-heading" className="text-h2 text-fg">
            Sources
          </h2>
          <ol className="flex max-w-prose list-decimal flex-col gap-2 pl-5 text-body text-fg-muted marker:text-fg-subtle">
            {meta.sources.map((source) => (
              <li key={source.url}>
                <TextLink href={source.url} rel="noopener">
                  {source.title}
                </TextLink>
                , {source.publisher}
              </li>
            ))}
          </ol>
        </section>
      </Container>
    </>
  );
}
