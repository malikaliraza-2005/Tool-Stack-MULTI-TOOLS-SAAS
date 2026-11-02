import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

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
              If the PDF has fillable fields, fill them in under <Strong>Form fields</Strong> beside
              the page. The field you are editing is highlighted on the page.
            </>,
            <>
              Select <Strong>Add signature</Strong> and draw, type or upload it. Use{" "}
              <Strong>Text</Strong>, <Strong>Date</Strong> (today’s date) and{" "}
              <Strong>Checkmark</Strong> for anything else; edit the words of a selected text in the
              panel beside the page.
            </>,
            <>
              Drag each item into place and resize it with its corner handle. With the keyboard,
              select it and use the arrow keys to move it (with Shift, 10 points at a time), + and −
              to resize it, and Delete to remove it.
            </>,
            <>
              Select <Strong>Save signed PDF</Strong>, then <Strong>Download PDF</Strong>. The file
              is named after the original, for example <Code>contract-signed.pdf</Code>.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="signature" title="About the signature">
        <Paragraph>
          This adds a <Strong>visual signature</Strong>: an image of your signature drawn on the
          page. It is not a certified digital signature: there is no certificate, nothing proves who
          signed, and the document isn’t locked against later changes. Many people and businesses
          accept signatures like this; check whether the recipient accepts electronic signatures.
        </Paragraph>
        <Facts
          items={[
            {
              term: "Draw",
              description: "With a mouse, finger or stylus, in black or blue ink.",
            },
            {
              term: "Type",
              description: "Your name in one of 12 handwriting styles, in black or blue ink.",
            },
            {
              term: "Upload",
              description:
                "A PNG, JPG or WebP image, such as a photo of your signature on paper. “Make a white background transparent” is on by default.",
            },
            {
              term: "Remember",
              description:
                "“Remember my signature on this device” is off by default. When you turn it on, the signature is kept in this browser only. Next time it appears with “Use saved” and a Delete button to remove it.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How it works">
        <Paragraph>
          The PDF is read and saved in your browser with the open-source pdf-lib library; pages are
          shown with pdf.js. With <Strong>Flatten (fields can’t be edited afterwards)</Strong> on,
          which is the default, every form field becomes part of the page, so it looks the same in
          every reader and can’t be changed by accident. Turn it off to keep the fields fillable.
        </Paragraph>
        <Paragraph>
          Signatures, text, dates and checkmarks are always drawn onto the page. Text in Western
          European languages is written as real, selectable text; other scripts, such as Greek,
          Cyrillic or Chinese, are placed as an image so they still show correctly.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“This PDF uses an XFA form …”</Strong> XFA forms (made with Adobe LiveCycle)
              can’t be filled here. You can still place a signature, text, dates and checkmarks on
              the pages.
            </>,
            <>
              <Strong>“… contains characters the PDF’s form font can’t show …”</Strong> Form fields
              use the PDF’s standard font, which covers Western European languages. Clear that field
              and place the words with <Strong>Text</Strong> instead: it works with any language.
            </>,
            <>
              <Strong>“… is password-protected.”</Strong> Remove the password in a PDF reader first,
              then try again.
            </>,
            <>
              <Strong>“… a button or signature field, which can’t be filled here.”</Strong> Place
              your signature with <Strong>Add signature</Strong> on top of the signature box
              instead.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
