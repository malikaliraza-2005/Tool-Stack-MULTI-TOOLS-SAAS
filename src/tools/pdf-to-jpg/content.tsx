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
              Under <Strong>Format</Strong>, pick <Strong>JPG</Strong> or <Strong>PNG</Strong>.
              Under <Strong>Resolution</Strong>, pick <Strong>72 DPI</Strong>,{" "}
              <Strong>150 DPI</Strong> or <Strong>300 DPI</Strong>. JPG at 150 DPI is the default.
            </>,
            <>
              Keep <Strong>All pages</Strong>, or choose <Strong>Some pages</Strong> and type a{" "}
              <Strong>Page range</Strong> such as <Code>1-3, 5, 8-</Code> (<Code>8-</Code> means
              page 8 to the end).
            </>,
            <>
              Select the convert button, for example <Strong>Convert 12 pages to JPG</Strong>. Then
              use <Strong>Download image</Strong> for a single page, or{" "}
              <Strong>Download all (ZIP)</Strong> for several; each image also has its own download
              button.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Resolution and format">
        <Facts
          items={[
            {
              term: "72 DPI",
              description: "Small previews and thumbnails. An A4 page is about 595 × 842 pixels.",
            },
            {
              term: "150 DPI",
              description: "Screens, documents and sharing. A4 is about 1240 × 1754 pixels.",
            },
            {
              term: "300 DPI",
              description:
                "Print quality. A4 is about 2480 × 3508 pixels: four times the pixels of 150 DPI, so files are much larger.",
            },
            {
              term: "JPG",
              description:
                "Smaller files, saved at quality 90 (of 100). Best for scans and photos.",
            },
            {
              term: "PNG",
              description:
                "Lossless, so text and line art come out exactly as rendered. Files are larger.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How it works">
        <Paragraph>
          Each page is drawn into an image by the open-source pdf.js renderer, one page at a time,
          so memory use stays flat even for long documents. Pages are drawn on a white background,
          as they appear in a PDF reader, so PNGs have no transparent areas. Images are named after
          the PDF and page, for example <Code>report-page-3.jpg</Code>; several images come together
          in <Code>report-images.zip</Code>.
        </Paragraph>
        <Paragraph>
          Browsers limit how large an image can be drawn. On phones and tablets the limit is about
          16.7 megapixels (the iPhone’s limit); on computers it is 100 megapixels. A page that would
          exceed it at the chosen resolution is reduced to fit, keeping its proportions, and the
          result says so.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… reduced to fit this device’s limit …”</Strong> The page is too large to
              draw at that resolution here. Choose a lower resolution, or convert on a computer for
              full size.
            </>,
            <>
              <Strong>“… is password-protected.”</Strong> Remove the password in a PDF reader first,
              then try again.
            </>,
            <>
              <Strong>“… couldn’t be read.”</Strong> The PDF is damaged or incomplete. Download it
              again and choose the new copy.
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
