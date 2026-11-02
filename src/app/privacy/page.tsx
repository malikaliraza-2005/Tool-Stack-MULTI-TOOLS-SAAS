import type { Metadata } from "next";
import { SitePage } from "@/components/layout/SitePage";
import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
  TextLink,
} from "@/components/tool/content";
import { CONTACT_EMAIL } from "@/config/site";
import { sitePageMetadata, type SitePageSeo } from "@/lib/seo";

// Privacy policy (G-9, P8-T07). Every statement is backed by a fact recorded in
// docs/07-legal/privacy-policy.md; change both together.

const PAGE: SitePageSeo = {
  path: "/privacy",
  title: "Privacy policy · Sprigkit",
  description:
    "How Sprigkit handles your data: files and text are processed in your browser and never uploaded. No accounts, cookies, ads or analytics.",
  name: "Privacy policy",
  type: "WebPage",
  updated: "2026-11-02",
};

export const metadata: Metadata = sitePageMetadata(PAGE);

export default function PrivacyPage() {
  return (
    <SitePage
      page={PAGE}
      h1="Privacy policy"
      intro="Sprigkit’s tools run in your browser, so the files and text you use them with never reach us. This page explains what that means, the little that does reach a server, and how to check it yourself."
    >
      <ContentSection id="summary" title="Summary">
        <List
          items={[
            <>
              <Strong>Your files and text stay on your device.</Strong> Your browser processes them;
              they are never sent to Sprigkit or anyone else.
            </>,
            <>
              <Strong>No accounts, cookies, ads or analytics.</Strong>
            </>,
            <>
              <Strong>A few preferences are saved in your browser,</Strong> such as the theme. Your
              content is not, except a signature you choose to remember in Fill &amp; Sign PDF.
            </>,
            <>
              <Strong>Our host, Cloudflare,</Strong> receives the technical data any website
              receives when your browser loads it, such as your IP address.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="your-files" title="What happens to your files and text">
        <Paragraph>
          When you open a tool, your browser downloads its code from Sprigkit and runs it on your
          device. Files you add and text you paste are read into your browser’s memory, processed
          there, and the result is created there too. Downloading a result saves it from your
          browser’s memory to your device; nothing is uploaded on the way.
        </Paragraph>
        <Paragraph>
          Your content is never put in the address bar and never saved by Sprigkit. It is gone when
          you close or reload the page, or remove it from the tool.
        </Paragraph>
        <Paragraph>
          This is enforced, not just promised: the site’s security policy (
          <Code>connect-src &apos;self&apos;</Code>) tells your browser to block any attempt by the
          page to send data to another server. Sprigkit has no server that accepts files, and no
          accounts.
        </Paragraph>
      </ContentSection>

      <ContentSection id="storage" title="What is stored in your browser">
        <Paragraph>
          Sprigkit saves a few small items in your browser’s local storage, under keys that start
          with <Code>ts:v1:</Code>. They stay on your device and are never sent anywhere.
        </Paragraph>
        <Facts
          items={[
            { term: "Theme", description: "Light, dark or system." },
            {
              term: "Tool options",
              description:
                "The options you last used in each tool, such as image quality or JSON indentation. Never your input or results.",
            },
            {
              term: "Favorites and recent tools",
              description: "The names of tools you starred or opened recently.",
            },
            {
              term: "Saved signature",
              description: (
                <>
                  Only if you tick <Strong>Remember my signature on this device</Strong> in Fill
                  &amp; Sign PDF. It is kept as an image in this browser until you select{" "}
                  <Strong>Delete</Strong> next to it in the signature dialog, or clear the site’s
                  data.
                </>
              ),
            },
          ]}
        />
        <Paragraph>
          To work offline, Sprigkit also keeps a copy of its own files (pages, code, fonts and the
          PDF and image engines) in your browser’s cache. That copy contains no content of yours.
        </Paragraph>
        <Paragraph>
          You can remove all of this at any time by clearing this site’s data in your browser’s
          settings.
        </Paragraph>
      </ContentSection>

      <ContentSection id="hosting" title="Hosting">
        <Paragraph>
          Sprigkit is a set of static files served by Cloudflare Pages. When your browser requests a
          page or file, Cloudflare receives what any web server receives: your IP address, the
          address requested, your browser’s user agent and the time. Cloudflare uses this to deliver
          the site and protect it from abuse, as described in{" "}
          <TextLink href="https://www.cloudflare.com/privacypolicy/" rel="noopener">
            Cloudflare’s privacy policy
          </TextLink>
          .
        </Paragraph>
        <Paragraph>
          This means Cloudflare can see which pages and files your browser loads, for example the
          PDF engine when you use a PDF tool, but never the files or text you use them with.
          Sprigkit runs no server of its own and does not use this data to identify you.
        </Paragraph>
      </ContentSection>

      <ContentSection id="analytics" title="Analytics, cookies and ads">
        <Paragraph>
          Sprigkit uses no analytics, sets no cookies and shows no ads. If privacy-friendly
          analytics is added later, this section will name the provider and say exactly what it
          receives before it is switched on. It will never receive your files, text or results.
        </Paragraph>
      </ContentSection>

      <ContentSection id="verify" title="How to verify it yourself">
        <Steps
          items={[
            <>
              Open a tool, then open your browser’s developer tools: press F12 or Ctrl+Shift+I (⌘⌥I
              on a Mac).
            </>,
            <>
              Select the <Strong>Network</Strong> tab and keep it open.
            </>,
            <>
              Use the tool with a file or some text. Every request goes to Sprigkit’s own address
              and fetches the site’s files; none carries your content.
            </>,
            <>
              For a stronger test, disconnect from the internet after the tool has loaded, or choose{" "}
              <Strong>Offline</Strong> in the Network tab, and use the tool again. It still works,
              because everything happens on your device.
            </>,
          ]}
        />
        <Paragraph>
          To see what is stored, open the <Strong>Application</Strong> tab (<Strong>Storage</Strong>{" "}
          in Firefox and Safari) and look at Local storage for this site.
        </Paragraph>
      </ContentSection>

      <ContentSection id="changes" title="Changes to this policy">
        <Paragraph>
          If this policy changes, this page is updated and the date at the top changes. A change
          that affects your data, such as adding analytics, is described here before it takes
          effect.
        </Paragraph>
      </ContentSection>

      <ContentSection id="contact" title="Contact">
        <Paragraph>
          Sprigkit is run by Ali Raza. For questions about this policy, email{" "}
          <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>.
        </Paragraph>
      </ContentSection>
    </SitePage>
  );
}
