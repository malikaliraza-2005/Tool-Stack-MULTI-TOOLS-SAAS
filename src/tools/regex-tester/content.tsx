import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for Regex Tester (no heavy imports: rendered at build time). */
export default function RegexTesterContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to test a regular expression">
        <Steps
          items={[
            <>
              Type the pattern without the surrounding slashes, for example{" "}
              <Code>{String.raw`\d{3}-\d{4}`}</Code>, and tick the flags you need.
            </>,
            <>
              Paste the text to test. Matches are highlighted as you type, and each match is listed
              with its position and its numbered and named groups.
            </>,
            <>
              Choose <Strong>Replace</Strong> to preview a replacement such as{" "}
              <Code>{"$<year>-$2"}</Code>, then copy or download the result.
            </>,
            <>
              Read the <Strong>Explanation</Strong> to check what each part of the pattern does.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="formats" title="Replacement patterns">
        <Facts
          items={[
            { term: "$1, $2 …", description: "The text of a numbered group." },
            { term: "$<name>", description: "The text of a named group (?<name>…)." },
            { term: "$&", description: "The whole match." },
            { term: "$` and $'", description: "The text before and after the match." },
            { term: "$$", description: "A literal dollar sign." },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Safe by design">
        <Paragraph>
          Patterns run in a separate background thread, never on the page itself. If a pattern runs
          for more than 1 second, for example because of catastrophic backtracking, the thread is
          stopped and replaced, and the page stays responsive. The explanation is produced by
          reading the pattern, without running it.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>Only one match is found.</Strong> Turn on the <Code>g</Code> flag to find all
              matches.
            </>,
            <>
              <Strong>“This pattern took too long.”</Strong> Nested quantifiers like{" "}
              <Code>(a+)+</Code> or <Code>(.*)*</Code> can backtrack exponentially. Make them more
              specific or remove the nesting.
            </>,
            <>
              <Strong>
                <Code>{String.raw`\p{…}`}</Code> is an error.
              </Strong>{" "}
              Unicode property classes need the <Code>u</Code> or <Code>v</Code> flag.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
