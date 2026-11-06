import type { Metadata } from "next";
import { SitePage } from "@/components/layout/SitePage";
import { ContentSection, Facts, Paragraph, TextLink } from "@/components/tool/content";
import { CONTACT_EMAIL } from "@/config/site";
import { sitePageMetadata, type SitePageSeo } from "@/lib/seo";
import { CATEGORIES, CATEGORY_ORDER, publishedTools } from "@/tools/registry";

// About (G-10, P8-T06): what QuietBench is, how it works, who runs it, contact.
// Product facts match the homepage, Privacy and Terms (page-seo-specs §4.3).

const PAGE: SitePageSeo = {
  path: "/about",
  title: "About QuietBench",
  description:
    "Who builds QuietBench, how its PDF, image and developer tools run in your browser without uploading anything, and how to get in touch.",
  name: "About",
  type: "AboutPage",
};

export const metadata: Metadata = sitePageMetadata(PAGE);

export default function AboutPage() {
  const tools = publishedTools();
  return (
    <SitePage
      page={PAGE}
      h1="About QuietBench"
      intro={`QuietBench is a collection of ${tools.length} free tools for PDFs, images and code that run entirely in your browser. Nothing you put into them is uploaded.`}
    >
      <ContentSection id="what" title="What QuietBench is">
        <Paragraph>
          Most online tools upload your file to a server, process it there and send it back. That is
          a poor fit for the files people most often need to fix: contracts, scanned IDs, bank
          statements, photos that record where they were taken, or API tokens and customer data.
          QuietBench does the same jobs without the upload.
        </Paragraph>
        <Facts
          items={CATEGORY_ORDER.map((category) => ({
            term: <TextLink href={CATEGORIES[category].href}>{CATEGORIES[category].name}</TextLink>,
            description: tools
              .filter((tool) => tool.category === category)
              .map((tool) => tool.name)
              .join(", "),
          }))}
        />
      </ContentSection>

      <ContentSection id="how" title="How it works">
        <Paragraph>
          QuietBench is a static website: there is no server that receives files and no account
          system. When you open a tool, your browser downloads its code, including the PDF engines
          (pdf-lib and pdf.js) and image codecs compiled to WebAssembly, and runs it on your device.
          Heavy work runs in the background so the page stays responsive.
        </Paragraph>
        <Paragraph>
          The site’s security policy blocks the page from sending data to any other server, and you
          can check this yourself in your browser’s developer tools. After your first visit the
          pages also work offline. The details are in the{" "}
          <TextLink href="/privacy">privacy policy</TextLink>, and the open-source software
          QuietBench is built with is on the <TextLink href="/licenses">licenses page</TextLink>.
        </Paragraph>
      </ContentSection>

      <ContentSection id="who" title="Who runs it">
        <Paragraph>
          QuietBench is built and run by Ali Raza, an independent developer. It is free to use, with
          no ads, accounts or paid plans.
        </Paragraph>
      </ContentSection>

      <ContentSection id="contact" title="Contact">
        <Paragraph>
          For questions, bug reports or ideas, email{" "}
          <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>. When reporting a
          bug, mention the tool, your browser and device, and what you expected. Don’t attach a
          private file; describe it instead, or send a copy without personal information.
        </Paragraph>
      </ContentSection>
    </SitePage>
  );
}
