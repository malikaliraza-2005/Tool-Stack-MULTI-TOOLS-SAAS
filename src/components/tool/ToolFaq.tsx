import type { ToolFaq as Faq } from "@/tools/types";
import { ContentSection } from "./content";

/**
 * FAQs from the registry, always visible (they feed FAQPage JSON-LD, which
 * must match visible content: architecture §12).
 */
export function ToolFaq({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) return null;
  return (
    <ContentSection id="faq" title="Frequently asked questions">
      <div className="flex max-w-prose flex-col divide-y divide-border border-y border-border">
        {faqs.map((faq) => (
          <div key={faq.q} className="flex flex-col gap-2 py-5">
            <h3 className="text-h3 text-fg">{faq.q}</h3>
            <p className="text-body text-fg-muted">{faq.a}</p>
          </div>
        ))}
      </div>
    </ContentSection>
  );
}
