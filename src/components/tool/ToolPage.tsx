import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { SITE_NAME } from "@/config/site";
import { toolJsonLd } from "@/lib/seo";
import { CATEGORIES, getTool, relatedTools } from "@/tools/registry";
import type { ToolDefinition } from "@/tools/types";
import { Code, ContentSection, List, Paragraph } from "./content";
import { FavoriteButton } from "./FavoriteButton";
import { JsonLd } from "./JsonLd";
import { PrivacyMeter } from "./PrivacyMeter";
import { RelatedTools } from "./RelatedTools";
import { ToolFaq } from "./ToolFaq";
import { ToolLoader } from "./ToolLoader";

/**
 * Tool page template (design-system §10.2, ui-ux-specification §4). Server
 * rendered at build time: breadcrumbs, H1, tagline, privacy meter, the
 * workspace (pre-rendered by ToolLoader, so it doesn't shift when it
 * hydrates), supporting content, FAQ and related tools.
 */
export function ToolPage({ tool, content }: { tool: ToolDefinition; content: ReactNode }) {
  const category = CATEGORIES[tool.category];
  return (
    <>
      <JsonLd data={toolJsonLd(tool)} />
      <Container size="tool" className="flex flex-col gap-6 pt-6 pb-12 md:pt-8">
        <Breadcrumbs
          items={[
            { label: SITE_NAME, href: "/" },
            { label: category.name, href: category.href },
            { label: tool.shortName ?? tool.name },
          ]}
        />
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 text-fg">{tool.seo.h1}</h1>
            <p className="max-w-prose text-body-lg text-fg-muted">{tool.tagline}</p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <PrivacyMeter />
            <FavoriteButton slug={tool.slug} name={tool.name} />
          </div>
        </header>
        <section
          aria-label={`${tool.name} workspace`}
          className="rounded-lg border border-border bg-surface shadow-1"
        >
          <ToolLoader slug={tool.slug} handoff={handoffTargets(tool)} />
        </section>
      </Container>
      <Container size="content" className="section-stack pb-(--section-gap)">
        {content}
        <PrivacySection />
        <ToolFaq faqs={tool.seo.faqs} />
        <RelatedTools tools={relatedTools(tool)} />
      </Container>
    </>
  );
}

/** "Use in another tool" targets that have a page (G-11). */
function handoffTargets(tool: ToolDefinition) {
  return (tool.handoff ?? []).flatMap((slug) => {
    const target = getTool(slug);
    return target
      ? [{ slug, name: target.name, multiple: target.input.accepts?.multiple ?? false }]
      : [];
  });
}

/** Shared explanation the PrivacyMeter links to (literal and verifiable: content-voice §3). */
function PrivacySection() {
  return (
    <ContentSection id="privacy" title="How your data stays private">
      <Paragraph>
        Everything happens in your browser, on your device. Your files and text are never uploaded,
        never stored, and never put in the address bar.
      </Paragraph>
      <List
        items={[
          <>
            The site’s security policy (<Code>connect-src &apos;self&apos;</Code>) tells your
            browser to block any attempt by the page to send data to another server.
          </>,
          <>
            Only your preferences, such as the theme and a tool’s last-used options, are saved in
            your browser’s local storage. Never your content.
          </>,
          <>
            To check it yourself, open your browser’s developer tools, select the Network tab, and
            use the tool: no request carries your data.
          </>,
        ]}
      />
    </ContentSection>
  );
}
