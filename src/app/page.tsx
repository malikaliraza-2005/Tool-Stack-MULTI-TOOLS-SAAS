import type { CSSProperties } from "react";
import { Container } from "@/components/layout/Container";
import { heroTools } from "@/components/home/hero-tools";
import { InstrumentHero } from "@/components/home/InstrumentHero";
import { PopularTools } from "@/components/home/PopularTools";
import { PrivacyStrip } from "@/components/home/PrivacyStrip";
import { ToolIndex } from "@/components/home/ToolIndex";
import { ToolFaq } from "@/components/tool/ToolFaq";
import { publishedTools } from "@/tools/registry";

const HOME_FAQS = [
  {
    q: "Are my files uploaded?",
    a: "No. Every tool runs in your browser, on your device. The site’s security policy stops the page from sending data to any other server, and you can check it in your browser’s developer tools (Network tab).",
  },
  {
    q: "What can I drop or paste on this page?",
    a: "PDFs, images (JPG, PNG, WebP, AVIF, HEIC, GIF, BMP), JSON and text files, or any file to hash. Pasted text such as a JWT, JSON, a Unix timestamp, a URL or Base64 opens the matching tool with the text filled in.",
  },
  {
    q: "Is Sprigkit free?",
    a: "Yes. Every tool is free to use, with no account, no sign-up and no watermarks.",
  },
  {
    q: "Which browsers does Sprigkit work in?",
    a: "Current versions of Chrome, Edge, Firefox and Safari, on computers and phones. Very large files work best on a computer, because phones have less memory.",
  },
];

/** Entrance order (P7-T08): staggered by --dur-stagger, never blocking input. */
const enter = (index: number) => ({ "--stagger-index": index }) as CSSProperties;

// Homepage (design-system §10.1, ui-ux-specification §3).
export default function Home() {
  const tools = publishedTools();
  return (
    <>
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
              Drop a file or paste text, and Sprigkit opens the right tool. Everything runs in your
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
