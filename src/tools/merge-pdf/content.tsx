import { ContentSection, Facts, List, Paragraph, Steps, Strong } from "@/components/tool/content";

/** Supporting content for Merge PDF (no heavy imports: rendered at build time). */
export default function MergePdfContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to merge PDF files">
        <Steps
          items={[
            <>
              Drop your PDF files on the box above, or select <Strong>Choose files</Strong>. You can
              also paste files with Ctrl+V (⌘V).
            </>,
            <>
              Put the files in the order you want. Drag a file by its handle, or use the arrow
              buttons next to it.
            </>,
            <>
              Optionally change the <Strong>File name</Strong>, then select the merge button. It
              shows how many files will be combined, for example <Strong>Merge 3 PDFs</Strong>.
            </>,
            <>
              Select <Strong>Download merged PDF</Strong>. The pages of each file follow each other
              in the order of the list.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            {
              term: "Accepted files",
              description:
                "PDF documents (.pdf). Files are checked by their content, not their name.",
            },
            {
              term: "Number of files",
              description: "2 to 100 on a computer, up to 50 on phones and tablets.",
            },
            {
              term: "Total size",
              description:
                "Up to 500 MB on a computer and 150 MB on phones and tablets. Above 100 MB (50 MB on phones and tablets) merging may be slow.",
            },
            { term: "Output", description: "One PDF, named merged.pdf unless you change it." },
          ]}
        />
      </ContentSection>

      <ContentSection id="what-is-kept" title="What is kept in the merged file">
        <Paragraph>
          Every page is copied as it is: its size, orientation and content stay the same, so a
          document with A4 and Letter pages keeps both sizes. Text stays selectable and searchable
          where it was before.
        </Paragraph>
        <Paragraph>
          The merged file is a new document, so the title and author stored in the originals are not
          copied, and bookmarks (the outline shown in a PDF reader’s sidebar) are not carried over.
          Fillable form fields may appear but are not guaranteed to keep working. If you need any of
          these, check the merged file before you share it.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… is password-protected.”</Strong> Encrypted PDFs can’t be merged yet. Open
              the file in a PDF reader that knows the password, save it as a new PDF without a
              password, and add that file instead.
            </>,
            <>
              <Strong>“… isn’t a supported file” or “… is a JPEG image.”</Strong> The file isn’t a
              PDF, even if its name ends in .pdf. Images need to be converted to PDF first.
            </>,
            <>
              <Strong>“… couldn’t be read.”</Strong> The file is damaged or was only partly
              downloaded. Download it again, or open and re-save it in a PDF reader.
            </>,
            <>
              <Strong>“Adding … would bring the total to …”</Strong> The files together are over the
              size limit for your device. The file is marked in the list and left out; remove some
              files or merge in two rounds.
            </>,
            <>
              <Strong>“Your browser ran out of memory.”</Strong> Merge fewer or smaller files at a
              time, close other tabs, or use a computer instead of a phone.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
