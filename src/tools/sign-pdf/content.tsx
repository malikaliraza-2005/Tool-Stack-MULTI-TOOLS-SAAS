import { ContentSection, Facts, List, Paragraph, Steps, Strong } from "@/components/tool/content";

/** Supporting content for Fill & Sign PDF (no heavy imports: rendered at build time). */
export default function SignPdfContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to fill and sign a PDF">
        <Steps
          items={[
            <>
              Select <Strong>Choose file</Strong> or drop a PDF on the page.
            </>,
            <>
              Fill in any form fields listed beside the page. The field you are editing is
              highlighted on the page.
            </>,
            <>
              Select <Strong>Add signature</Strong> and draw, type or upload it. Add{" "}
              <Strong>Text</Strong>, a <Strong>Date</Strong> or a <Strong>Checkmark</Strong> where
              you need them.
            </>,
            <>
              Drag each item into place and resize it with its corner handle, or select it and use
              the arrow keys (with Shift for bigger steps) and + and −.
            </>,
            <>
              Select <Strong>Save signed PDF</Strong>, then download it.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="signature" title="About the signature">
        <Paragraph>
          This adds a <Strong>visual signature</Strong>: an image of your signature drawn on the
          page. It is not a certified digital signature with a certificate, and it doesn’t lock the
          document. Many people and businesses accept signatures like this; check whether the
          recipient accepts electronic signatures.
        </Paragraph>
        <Facts
          items={[
            { term: "Draw", description: "With a mouse, finger or stylus. Black or blue ink." },
            { term: "Type", description: "Your name in one of three handwriting styles." },
            {
              term: "Upload",
              description: "A PNG, JPG or WebP image. A white background can be made transparent.",
            },
            {
              term: "Remember",
              description:
                "Off by default. When you turn it on, the signature is kept in this browser only, and you can delete it at any time.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How it works">
        <Paragraph>
          The PDF is read and saved in your browser with the open-source pdf-lib library; pages are
          shown with pdf.js. With <Strong>Flatten</Strong> on (the default), filled-in fields become
          part of the page, so they look the same in every reader and can’t be changed by accident.
          Signatures, text and checkmarks are always drawn onto the page.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“This PDF uses an XFA form.”</Strong> XFA forms (made with Adobe LiveCycle)
              can’t be filled here. You can still place a signature and text on the pages.
            </>,
            <>
              <Strong>“… characters the PDF’s form font can’t show.”</Strong> Form fields use the
              PDF’s standard font, which covers Western European languages. Use{" "}
              <Strong>Text</Strong> instead: it works with any language.
            </>,
            <>
              <Strong>“… is password-protected.”</Strong> Remove the password in a PDF reader first,
              then try again.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
