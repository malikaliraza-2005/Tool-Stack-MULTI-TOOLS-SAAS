import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for UUID Generator (no heavy imports: rendered at build time). */
export default function UuidGeneratorContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to generate UUIDs">
        <Steps
          items={[
            <>
              Choose a <Strong>Type</Strong>: <Strong>UUID v4 (random)</Strong>, the default,{" "}
              <Strong>UUID v7 (time-ordered)</Strong> or <Strong>ULID</Strong>. A new value appears
              straight away.
            </>,
            <>
              Set <Strong>How many</Strong>, from 1 to 1,000. For UUIDs, turn on{" "}
              <Strong>Uppercase</Strong> or turn off <Strong>Hyphens</Strong> if your system needs
              that form; ULIDs are always uppercase without hyphens.
            </>,
            <>
              Copy a single value with its copy button. For a batch, select{" "}
              <Strong>Copy all</Strong> or download them as a .txt file, one per line.{" "}
              <Strong>Generate new</Strong> makes a fresh set.
            </>,
            <>
              To check a UUID, paste it under <Strong>Inspect</Strong> to see its version, variant
              and, for versions 1, 6 and 7, when it was created. Hyphens, braces and the{" "}
              <Code>urn:uuid:</Code> prefix are accepted.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="formats" title="UUID v4, v7 and ULID">
        <Facts
          items={[
            {
              term: "UUID v4",
              description: (
                <>
                  122 random bits, for example <Code>919108f7-52d1-4320-9bac-f847db4148a8</Code>.
                  The <Code>4</Code> at the start of the third group is the version.
                </>
              ),
            },
            {
              term: "UUID v7",
              description: (
                <>
                  A 48-bit millisecond timestamp, then random bits (RFC 9562). Values created later
                  sort later, which keeps database indexes compact. Within one millisecond a counter
                  keeps a batch in order.
                </>
              ),
            },
            {
              term: "ULID",
              description: (
                <>
                  26 characters of Crockford Base32, for example{" "}
                  <Code>01ARYZ6S41TSV4RRFFQ69G5FAV</Code>: 10 for the time, 16 random. Sortable,
                  shorter than a UUID, and without ambiguous letters (no I, L, O or U).
                </>
              ),
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How the values are made">
        <Paragraph>
          The random bits come from your browser’s cryptographic random number generator (
          <Code>crypto.getRandomValues</Code>). UUID v7 and ULID also take the time from your
          device’s clock, so their timestamps are only as accurate as that clock.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“This has 31 hex digits.”</Strong> A UUID has exactly 32 hex digits, so part
              of it was probably lost when copying. Copy it again in full.
            </>,
            <>
              <Strong>Version shows “Not an RFC 9562 UUID.”</Strong> The variant bits (the first
              digit of the fourth group) aren’t 8, 9, a or b. Some older Microsoft GUIDs use another
              variant; the value can still be a valid identifier.
            </>,
            <>
              <Strong>“This looks like a ULID.”</Strong> The inspector reads UUIDs only. A ULID’s
              first 10 characters are its creation time in milliseconds.
            </>,
            <>
              <Strong>No creation time is shown.</Strong> Only versions 1, 6 and 7 contain a
              timestamp. Version 4 is entirely random.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
