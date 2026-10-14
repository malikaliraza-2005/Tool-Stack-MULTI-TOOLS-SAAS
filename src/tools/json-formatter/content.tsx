import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for JSON Formatter (no heavy imports: rendered at build time). */
export default function JsonFormatterContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to format and validate JSON">
        <Steps
          items={[
            <>
              Paste your JSON into the <Strong>Input</Strong> editor, or select{" "}
              <Strong>Open file</Strong> to load a .json file. <Strong>Sample</Strong> fills in an
              example.
            </>,
            <>
              The output updates as you type. If the JSON isn’t valid, you see the line and column
              of the first problem, and that line is highlighted.
            </>,
            <>
              Choose a mode: <Strong>Format</Strong> pretty-prints with 2 spaces, 4 spaces or tabs;{" "}
              <Strong>Minify</Strong> removes all whitespace; <Strong>Tree</Strong> lets you browse
              the structure and copy the path of any value.
            </>,
            <>
              Copy the result, or download it as a .json file. Your last-used mode and options are
              remembered on this device; your JSON is not.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "Sort keys",
              description:
                "Orders the properties of every object alphabetically (by character code). Arrays keep their order.",
            },
            {
              term: "Allow comments",
              description: (
                <>
                  Accepts <Code>{"// line"}</Code> and <Code>{"/* block */"}</Code> comments and
                  trailing commas (JSONC, used by many configuration files). The output is always
                  standard JSON, so comments are removed.
                </>
              ),
            },
            {
              term: "Tree view",
              description: (
                <>
                  Use the arrow keys to move, → and ← to open and close, and{" "}
                  <Strong>Copy path</Strong> for a path like <Code>$.items[0].sku</Code>.
                </>
              ),
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Exact values, including large numbers">
        <Paragraph>
          The formatter rebuilds your JSON from its structure but copies every number and string
          exactly as you wrote it. That matters for large IDs: JavaScript can only represent whole
          numbers up to 9,007,199,254,740,991 exactly, so many tools silently change a value like{" "}
          <Code>123456789012345678901</Code>. Sprigkit keeps every digit and shows a note with the
          path of each such number, so you know to handle it as a string or BigInt in your code.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            {
              term: "Input",
              description:
                "JSON text, or JSON with comments when Allow comments is on. Files: .json or plain text.",
            },
            {
              term: "Size",
              description:
                "Up to 50 MB. Inputs over 1 MB are processed in a background thread, so the page stays responsive; above 5 MB it may be slow.",
            },
            {
              term: "Output",
              description:
                "Standard JSON (RFC 8259), downloaded as formatted.json or minified.json, or named after the file you opened.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“Trailing comma.”</Strong> Standard JSON doesn’t allow a comma after the last
              item. Remove it, or turn on Allow comments.
            </>,
            <>
              <Strong>“Property names need double quotes.”</Strong> JSON keys and strings use{" "}
              <Code>&quot;double quotes&quot;</Code>, not single quotes or no quotes.
            </>,
            <>
              <Strong>“Unexpected text after the end of the JSON.”</Strong> The input contains more
              than one value, for example several objects one after another (JSON Lines). Wrap them
              in <Code>[ ]</Code> and separate them with commas.
            </>,
            <>
              <Strong>The minified output isn’t shown.</Strong> Minified JSON over 1 MB is one very
              long line. Copy or download it instead.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
