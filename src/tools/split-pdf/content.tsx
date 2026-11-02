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
              Under <Strong>How to split</Strong>, pick <Strong>Extract pages into one PDF</Strong>,{" "}
              <Strong>Every N pages (several PDFs)</Strong> or{" "}
              <Strong>Single pages (one PDF per page)</Strong>.
            </>,
            <>
              To extract, type the <Strong>Pages</Strong> you want, for example{" "}
              <Code>1-3, 5, 8-</Code>. To split every N pages, set <Strong>Pages per file</Strong>.
              The summary shows how many files and pages you’ll get before anything is created.
            </>,
            <>
              Select the split button (<Strong>Split PDF</Strong>, or{" "}
              <Strong>Split into 4 PDFs</Strong> when there are several parts). Download one file
              with <Strong>Download PDF</Strong>, or several with{" "}
              <Strong>Download all (ZIP)</Strong>; each part also has its own download button.
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
          output file is named after the original: <Code>report-pages-1-3.pdf</Code> for extracted
          pages, <Code>report-part-2.pdf</Code> for every N pages, or <Code>report-page-7.pdf</Code>{" "}
          for single pages. Several parts come together in <Code>report-split.zip</Code>.
        </Paragraph>
        <Paragraph>
          Each part is a new document: bookmarks and the original’s title and author are not copied,
          and form fields may not keep working.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… is beyond the last page (…).”</Strong> The range asks for a page the PDF
              doesn’t have. The number in brackets is the last page; the count is also shown next to
              the file.
            </>,
            <>
              <Strong>“… goes backwards.”</Strong> Write ranges with the lower page first:{" "}
              <Code>3-5</Code>, not <Code>5-3</Code>.
            </>,
            <>
              <Strong>“… isn’t a page or a range.”</Strong> Only numbers, dashes and commas work.
              Separate parts with commas, not semicolons or the word “and”.
            </>,
            <>
              <Strong>“… is password-protected.”</Strong> Remove the password in a PDF reader first,
              then try again.
            </>,
            <>
              <Strong>“… couldn’t be read.”</Strong> The PDF is damaged or incomplete. Download it
              again, or re-save it from a PDF reader.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
