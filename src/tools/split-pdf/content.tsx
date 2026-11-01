import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for Split PDF (no heavy imports: rendered at build time). */
export default function SplitPdfContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to split a PDF">
        <Steps
          items={[
            <>
              Select <Strong>Choose file</Strong> or drop a PDF on the page. Its page count appears
              once it has been checked.
            </>,
            <>
              Choose how to split it: <Strong>Extract pages</Strong> into one new PDF,{" "}
              <Strong>Every N pages</Strong>, or <Strong>Single pages</Strong>.
            </>,
            <>
              For Extract pages, type the pages, for example <Code>1-3, 5, 8-</Code>. The summary
              shows how many files and pages you’ll get.
            </>,
            <>
              Select <Strong>Split</Strong>, then download the PDF, or all parts at once as a ZIP
              file.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="formats" title="Page ranges">
        <Facts
          items={[
            { term: "5", description: "A single page." },
            { term: "1-3", description: "Pages 1 to 3." },
            { term: "8-", description: "Page 8 to the last page." },
            { term: "-3", description: "The first page to page 3." },
            {
              term: "5, 1-3",
              description:
                "Several parts, separated by commas. Pages come out in this order; a page listed twice is included once.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What is kept">
        <Paragraph>
          Pages are copied exactly as they are, with their size, rotation, text and images. Each
          output file is named after the original: <Code>report-pages-1-3.pdf</Code>,{" "}
          <Code>report-part-2.pdf</Code> or <Code>report-page-7.pdf</Code>. Bookmarks and form
          fields that span the whole document may not carry over to the parts.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… is beyond the last page.”</Strong> The range asks for a page the PDF
              doesn’t have. Check the page count shown next to the file.
            </>,
            <>
              <Strong>“… goes backwards.”</Strong> Write ranges with the lower page first:{" "}
              <Code>3-5</Code>, not <Code>5-3</Code>.
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
