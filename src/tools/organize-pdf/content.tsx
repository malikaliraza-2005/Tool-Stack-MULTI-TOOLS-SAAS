import { ContentSection, Facts, List, Paragraph, Steps, Strong } from "@/components/tool/content";

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
              Drag pages to reorder them (on a phone or tablet, press and hold first). Select
              several with Ctrl/⌘-click or Shift-click to move them together.
            </>,
            <>
              Use <Strong>Rotate left</Strong>, <Strong>Rotate right</Strong> and{" "}
              <Strong>Delete</Strong> on the selected pages. <Strong>Undo</Strong> and{" "}
              <Strong>Redo</Strong> step through every change.
            </>,
            <>
              Select <Strong>Save PDF</Strong> and download the result. Your original file isn’t
              changed.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Keyboard shortcuts">
        <Facts
          items={[
            { term: "Arrow keys", description: "Move between pages." },
            {
              term: "Space",
              description: "Select or deselect the page; Shift+arrows select a range.",
            },
            { term: "Ctrl/⌘ + arrow keys", description: "Move the selected pages." },
            { term: "R / Shift+R", description: "Rotate right / left." },
            { term: "Delete", description: "Delete the selected pages." },
            { term: "Ctrl/⌘ + Z, Ctrl/⌘ + Shift + Z", description: "Undo, redo." },
            { term: "Ctrl/⌘ + A, Escape", description: "Select all, clear the selection." },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What happens to your pages">
        <Paragraph>
          Pages are copied into a new PDF in the order you set, with their text, images and links.
          Rotation is stored as page rotation, so it’s exact and lossless. Thumbnails are drawn only
          for the pages you can see, which keeps documents with hundreds of pages responsive.
          Bookmarks that point to deleted pages are not kept.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>The last page can’t be deleted.</Strong> A PDF needs at least one page.
            </>,
            <>
              <Strong>A thumbnail stays blank.</Strong> The page may use features the preview can’t
              draw; it is still copied into the new PDF exactly.
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
