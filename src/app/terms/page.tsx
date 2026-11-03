import type { Metadata } from "next";
import { SitePage } from "@/components/layout/SitePage";
import { ContentSection, List, Paragraph, Strong, TextLink } from "@/components/tool/content";
import { CONTACT_EMAIL } from "@/config/site";
import { sitePageMetadata, type SitePageSeo } from "@/lib/seo";

// Terms of use (P8-T08). Decisions behind each section are recorded in
// docs/07-legal/terms-of-use.md; change both together.

const PAGE: SitePageSeo = {
  path: "/terms",
  title: "Terms of use · Ondevo",
  description:
    "The terms for using Ondevo: free tools provided as is, a visual signature that is not a certified digital signature, and your responsibilities.",
  name: "Terms of use",
  type: "WebPage",
  updated: "2026-11-02",
};

export const metadata: Metadata = sitePageMetadata(PAGE);

export default function TermsPage() {
  return (
    <SitePage
      page={PAGE}
      h1="Terms of use"
      intro="These terms apply when you use Ondevo. They are short because the service is simple: free tools that run in your browser, with no account."
    >
      <ContentSection id="using" title="Using Ondevo">
        <Paragraph>
          Ondevo is run by Ali Raza. By using the site you agree to these terms; if you don’t agree,
          don’t use it. The tools are free and need no account. Tools may be added, changed or
          removed at any time.
        </Paragraph>
        <Paragraph>Don’t use Ondevo:</Paragraph>
        <List
          items={[
            "for anything unlawful, such as processing files you have no right to use or altering documents to deceive someone;",
            "to interfere with the site or its hosting, for example by overloading it or trying to break its security.",
          ]}
        />
      </ContentSection>

      <ContentSection id="your-files" title="Your files">
        <Paragraph>
          Your files and text are processed on your device and never sent to us (see the{" "}
          <TextLink href="/privacy">privacy policy</TextLink>). You keep every right to them, and
          you are responsible for having the right to process them.
        </Paragraph>
        <Paragraph>
          The tools never change your original files; results are new files you download. Check a
          result before you rely on it or share it, and keep your originals.
        </Paragraph>
      </ContentSection>

      <ContentSection id="signatures" title="Signatures">
        <Paragraph>
          Fill &amp; Sign PDF places a picture of your signature on the page: a{" "}
          <Strong>visual signature</Strong>. It is{" "}
          <Strong>not a certified digital signature</Strong>: it carries no certificate, does not
          prove who signed, and does not show whether the document was changed afterwards.
        </Paragraph>
        <Paragraph>
          Whether a visual signature is accepted depends on the person or organization you send the
          document to and on the law that applies. Check before you rely on it for a contract or an
          official form.
        </Paragraph>
      </ContentSection>

      <ContentSection id="results" title="Results and accuracy">
        <Paragraph>
          The tools aim to be exact, and each page explains its limits. Results can still be wrong
          or incomplete, for example with unusual or damaged files. Check results that matter, such
          as a checksum, a decoded token or a converted document, before you depend on them.
        </Paragraph>
      </ContentSection>

      <ContentSection id="open-source" title="Open-source software">
        <Paragraph>
          Ondevo includes open-source software under its own licenses, listed on the{" "}
          <TextLink href="/licenses">licenses page</TextLink>. Nothing in these terms limits your
          rights under those licenses.
        </Paragraph>
      </ContentSection>

      <ContentSection id="no-warranty" title="No warranty">
        <Paragraph>
          Ondevo is provided “as is” and “as available”, without warranties of any kind, express or
          implied, including that it is fit for a particular purpose, accurate, uninterrupted or
          free of errors, to the extent the law allows.
        </Paragraph>
      </ContentSection>

      <ContentSection id="liability" title="Limitation of liability">
        <Paragraph>
          To the extent the law allows, Ali Raza is not liable for any indirect, incidental or
          consequential loss, or for loss of data, profits or business, that comes from using or
          being unable to use Ondevo. Because Ondevo is free, total liability for any claim is
          limited to the amount you paid to use it, which is nothing. Nothing in these terms limits
          liability that cannot be limited by law.
        </Paragraph>
      </ContentSection>

      <ContentSection id="changes" title="Changes to these terms">
        <Paragraph>
          These terms may change. The new version is posted here with a new date at the top, and
          applies from then on. Using Ondevo after a change means you accept the new terms.
        </Paragraph>
      </ContentSection>

      <ContentSection id="law" title="Governing law">
        <Paragraph>
          These terms are governed by the laws of Pakistan, and the courts of Pakistan have
          jurisdiction over any dispute about them. This does not take away protections that the
          consumer law of your own country gives you and that cannot be waived.
        </Paragraph>
      </ContentSection>

      <ContentSection id="contact" title="Contact">
        <Paragraph>
          Questions about these terms: email{" "}
          <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>.
        </Paragraph>
      </ContentSection>
    </SitePage>
  );
}
