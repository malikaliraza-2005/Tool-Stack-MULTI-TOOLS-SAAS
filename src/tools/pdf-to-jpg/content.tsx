import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for PDF to JPG (no heavy imports: rendered at build time). */
export default function PdfToJpgContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to convert PDF pages to images">
        <Steps
          items={[
            <>
              Select <Strong>Choose file</Strong> or drop a PDF on the page.
            </>,
            <>
              Pick <Strong>JPG</Strong> or <Strong>PNG</Strong> and a resolution: 72, 150 or 300
              DPI.
            </>,
            <>
              Convert <Strong>All pages</Strong>, or choose <Strong>Some pages</Strong> and type a
              range such as <Code>1-3, 5</Code>.
            </>,
            <>
              Select <Strong>Convert</Strong>, then download the image, or all images at once as a
              ZIP file.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Resolution and format">
        <Facts
          items={[
            {
              term: "72 DPI",
              description: "Small previews and thumbnails. An A4 page is 595 × 842 pixels.",
            },
            {
              term: "150 DPI",
              description: "Screens, documents and sharing. A4 is 1240 × 1754 pixels.",
            },
            {
              term: "300 DPI",
              description:
                "Print quality. A4 is 2480 × 3508 pixels; files are about four times larger.",
            },
            { term: "JPG", description: "Smaller files, quality 90%. Best for scans and photos." },
            { term: "PNG", description: "Lossless: text and line art stay perfectly sharp." },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How it works">
        <Paragraph>
          Each page is drawn into an image by the open-source pdf.js renderer, one page at a time,
          so memory use stays flat even for long documents. Pages are drawn on a white background,
          as they appear in a PDF reader. Images are named after the PDF and page, for example{" "}
          <Code>report-page-3.jpg</Code>.
        </Paragraph>
        <Paragraph>
          Phones limit how large an image can be drawn (about 16.7 megapixels on iPhone). A page
          that would exceed it at the chosen resolution is reduced to fit, and the result says so.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… was reduced to fit this device’s limit.”</Strong> Choose a lower
              resolution, or convert on a computer for full size.
            </>,
            <>
              <Strong>“… is password-protected.”</Strong> Remove the password in a PDF reader first,
              then try again.
            </>,
            <>
              <Strong>Text looks blurry.</Strong> Use 300 DPI, or PNG for diagrams and small text.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
