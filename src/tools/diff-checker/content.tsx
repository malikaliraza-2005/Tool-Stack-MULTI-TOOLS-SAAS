import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for Diff Checker (no heavy imports: rendered at build time). */
export default function DiffCheckerContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to compare two texts">
        <Steps
          items={[
            <>
              Paste or open the first version under <Strong>Original</Strong> and the second under{" "}
              <Strong>Changed</Strong>, or select <Strong>Sample</Strong> to try an example.
            </>,
            <>
              The differences appear below: removed lines marked <Code>−</Code> and added lines
              marked <Code>+</Code>, with the changed words highlighted inside each line.
            </>,
            <>
              Jump between changes with the arrow buttons, or press <Strong>N</Strong> and{" "}
              <Strong>P</Strong> while the differences have focus.
            </>,
            <>
              <Strong>Copy unified diff</Strong> or download <Code>changes.diff</Code> to share the
              changes or apply them with <Code>patch</Code>.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "View",
              description:
                "Side by side (the default) shows the two versions in columns; Inline shows each change’s removed lines followed by its added lines. Narrow screens always use the inline view.",
            },
            {
              term: "Highlight changes by",
              description:
                "Word (the default), Character or Line: how finely changes are highlighted inside a changed line. Line marks the whole line. Lines are always matched first.",
            },
            {
              term: "Ignore whitespace",
              description:
                "Lines that differ only in the amount of spaces, tabs or indentation, including spaces at the end of a line, count as equal. Each side still shows its own text.",
            },
            {
              term: "Ignore case",
              description: "Upper and lower case letters count as equal.",
            },
            {
              term: "Swap",
              description: "Exchanges the original and the changed text.",
            },
            {
              term: "Files",
              description:
                "Up to 50 MB per file (20 MB on phones and tablets). Above 5 MB (2 MB on phones and tablets) comparing may be slow.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How the comparison works">
        <Paragraph>
          The texts are split into lines and compared with the Myers algorithm, the same approach as{" "}
          <Code>diff</Code> and <Code>git diff</Code>, using the open-source <Code>jsdiff</Code>{" "}
          library in a background thread. Pairs of changed lines are then compared again word by
          word or character by character; lines longer than 10,000 characters are marked as a whole.
          Only the visible rows of the result are drawn, so results of tens of thousands of lines
          scroll smoothly. Windows (CRLF) and Unix (LF) line endings count as the same line break.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>Every line is marked as changed.</Strong> Often the indentation differs (tabs
              vs spaces) or lines end with extra spaces. Turn on <Strong>Ignore whitespace</Strong>.
            </>,
            <>
              <Strong>“Too different to compare quickly.”</Strong> The texts share almost nothing,
              so the comparison stopped after 10 seconds. Check that the right files are loaded, or
              compare smaller sections.
            </>,
            <>
              <Strong>The last line is marked although it looks the same.</Strong> One version ends
              with a line break and the other doesn’t; patches record this as a change too.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
