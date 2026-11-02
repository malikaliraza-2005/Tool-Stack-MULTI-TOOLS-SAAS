import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for Organize PDF (no heavy imports: rendered at build time). */
export default function OrganizePdfContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to organize PDF pages">
        <Steps
          items={[
            <>
              Select <Strong>Choose file</Strong> or drop a PDF on the page. Every page appears as a
              thumbnail.
            </>,
            <>
              Drag pages to reorder them (on a phone or tablet, press briefly, then drag). Select
              several with Ctrl/⌘-click or Shift-click to move them together. Without dragging, the{" "}
              <Strong>Move earlier</Strong> and <Strong>Move later</Strong> buttons shift the
              selected pages one place at a time.
            </>,
            <>
              Use the toolbar buttons <Strong>Rotate left</Strong>, <Strong>Rotate right</Strong>{" "}
              and <Strong>Delete</Strong> on the selected pages (or on the focused page when none is
              selected). <Strong>Undo</Strong> and <Strong>Redo</Strong> step through every change.
            </>,
            <>
              Select <Strong>Save PDF</Strong>, then <Strong>Download PDF</Strong>. The new file is
              named after the original, for example <Code>report-organized.pdf</Code>; the original
              file isn’t changed.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Keyboard shortcuts">
        <Facts
          items={[
            { term: "Arrow keys", description: "Move between pages." },
            { term: "Home / End", description: "Jump to the first or last page." },
            {
              term: "Space",
              description: "Select or deselect the page; Shift+arrows select a range.",
            },
            { term: "Ctrl/⌘ + arrow keys", description: "Move the selected pages." },
            { term: "R / Shift+R", description: "Rotate right / left." },
            { term: "Delete or Backspace", description: "Delete the selected pages." },
            {
              term: "Ctrl/⌘ + Z, Ctrl/⌘ + Shift + Z",
              description: "Undo, redo (Ctrl/⌘ + Y also redoes).",
            },
            { term: "Ctrl/⌘ + A, Escape", description: "Select all, clear the selection." },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What happens to your pages">
        <Paragraph>
          Pages are copied into a new PDF in the order you set, with their text, images and
          annotations. Rotation is stored as page rotation, so it’s exact and lossless: nothing is
          redrawn or recompressed. Thumbnails are drawn only for the pages you can see, which keeps
          documents with hundreds of pages responsive.
        </Paragraph>
        <Paragraph>
          Because the result is a new document, bookmarks and the original’s title and author are
          not kept, even for pages you didn’t touch.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“A PDF needs at least one page, so every page can’t be deleted.”</Strong>{" "}
              Deselect at least one page before you select <Strong>Delete</Strong>.
            </>,
            <>
              <Strong>A thumbnail keeps spinning.</Strong> The preview couldn’t draw that page. You
              can still move, rotate and delete it, and it is copied into the new PDF unchanged.
            </>,
            <>
              <Strong>“… is password-protected.”</Strong> Organize PDF can’t open encrypted files.
              Save an unprotected copy from a PDF reader that knows the password, then choose that
              copy.
            </>,
            <>
              <Strong>“… couldn’t be read.”</Strong> The file is damaged or didn’t finish
              downloading. Get a fresh copy and try again.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
