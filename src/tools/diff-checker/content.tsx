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
              <Strong>Changed</Strong>.
            </>,
            <>
              The differences appear below: removed lines marked <Code>−</Code> and added lines
              marked <Code>+</Code>, with the changed words highlighted.
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
              term: "Side by side / Inline",
              description:
                "Side by side shows the two versions in columns (on wide screens); inline shows removals and additions one after the other.",
            },
            {
              term: "Line / Word / Character",
              description:
                "How finely changes are highlighted inside a changed line. Lines are always matched first.",
            },
            {
              term: "Ignore whitespace",
              description:
                "Lines that differ only in the amount of spaces, tabs or indentation count as equal.",
            },
            {
              term: "Ignore case",
              description: "Upper and lower case letters count as equal.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How the comparison works">
        <Paragraph>
          The texts are split into lines and compared with the Myers algorithm, the same approach as{" "}
          <Code>diff</Code> and <Code>git diff</Code>, using the open-source <Code>jsdiff</Code>{" "}
          library in a background thread. Pairs of changed lines are then compared again word by
          word or character by character. Large files of tens of thousands of lines stay responsive
          because only the visible rows are drawn.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>Every line is marked as changed.</Strong> Often the line endings or
              indentation differ (tabs vs spaces). Turn on Ignore whitespace.
            </>,
            <>
              <Strong>“Too different to compare quickly.”</Strong> The texts share almost nothing,
              which makes the comparison very slow. Check that the right files are loaded, or
              compare smaller parts.
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
