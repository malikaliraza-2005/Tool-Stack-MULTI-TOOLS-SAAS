import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Container } from "@/components/layout/Container";
import { heroTools } from "@/components/home/hero-tools";
import { HOME_FAQS, HOME_SEO } from "@/components/home/home-content";
import { InstrumentHero } from "@/components/home/InstrumentHero";
import { PopularTools } from "@/components/home/PopularTools";
import { PrivacyStrip } from "@/components/home/PrivacyStrip";
import { ToolIndex } from "@/components/home/ToolIndex";
import { JsonLd } from "@/components/tool/JsonLd";
import { ToolFaq } from "@/components/tool/ToolFaq";
import { homeJsonLd, homeMetadata } from "@/lib/seo";
import { publishedTools } from "@/tools/registry";

export const metadata: Metadata = homeMetadata(HOME_SEO);

/** Entrance order (P7-T08): staggered by --dur-stagger, never blocking input. */
const enter = (index: number) => ({ "--stagger-index": index }) as CSSProperties;

// Homepage (design-system §10.1, ui-ux-specification §3).
export default function Home() {
  const tools = publishedTools();
  return (
    <>
      <JsonLd data={homeJsonLd(HOME_FAQS)} />
      <div className="relative">
        <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0" />
        <Container className="relative flex flex-col gap-8 pt-12 pb-12 md:pt-20 md:pb-16">
          <div className="mx-auto flex max-w-content flex-col items-center gap-4 text-center">
            {/* Not animated: the headline is the LCP element. */}
            <h1 className="text-display text-fg">Private tools for PDFs, images and code</h1>
            <p
              className="stagger max-w-prose animate-rise-in text-body-lg text-fg-muted"
              style={enter(1)}
            >
              Drop a file or paste text, and KeptLocal opens the right tool. Everything runs in your
              browser. Nothing is uploaded.
            </p>
          </div>
          <div className="stagger mx-auto w-full max-w-content animate-rise-in" style={enter(2)}>
            <InstrumentHero tools={heroTools(tools)} />
          </div>
        </Container>
      </div>
      <Container className="section-stack pb-(--section-gap)">
        <PrivacyStrip className="stagger animate-rise-in" style={enter(3)} />
        <div className="stagger animate-rise-in" style={enter(4)}>
          <ToolIndex tools={tools} />
        </div>
        <PopularTools tools={tools} />
        <ToolFaq faqs={HOME_FAQS} />
      </Container>
    </>
  );
}
