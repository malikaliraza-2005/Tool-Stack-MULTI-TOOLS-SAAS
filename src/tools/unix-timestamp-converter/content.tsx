import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for Unix Timestamp Converter (no heavy imports: rendered at build time). */
export default function UnixTimestampConverterContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to convert a Unix timestamp">
        <Steps
          items={[
            <>
              Paste a timestamp under <Strong>Timestamp to date</Strong>, or select{" "}
              <Strong>Now</Strong> to use the current time.
            </>,
            <>
              With <Strong>Detect automatically</Strong>, the unit comes from the number of digits
              and is shown under the field. If it’s wrong, choose <Strong>Seconds</Strong>,{" "}
              <Strong>Milliseconds</Strong> or <Strong>Microseconds</Strong> from the{" "}
              <Strong>Unit</Strong> menu.
            </>,
            <>
              Read the date in UTC, in your device’s time zone and in the <Strong>Time zone</Strong>{" "}
              chosen at the top, plus RFC 2822, how long ago it was, the day of the week, and the
              value in seconds and milliseconds. The dates and numbers each have a copy button.
            </>,
            <>
              To go the other way, pick a date and time under <Strong>Date to timestamp</Strong>.
              It’s read in the chosen time zone and converted to seconds and milliseconds.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What a Unix timestamp is">
        <Paragraph>
          A Unix timestamp (also called epoch time or POSIX time) is the number of seconds since
          00:00:00 UTC on January 1, 1970, not counting leap seconds. It names a moment, not a wall
          clock: <Code>1700000000</Code> is 22:13:20 on November 14, 2023 in London and 17:13:20 the
          same day in New York. Negative numbers are moments before 1970.
        </Paragraph>
        <Paragraph>
          Time zones matter only when you turn a timestamp into a calendar date, or a date into a
          timestamp. The converter uses your browser’s time zone database, so daylight saving rules
          are applied for each date, including historical changes.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and units">
        <Facts
          items={[
            {
              term: "Detection",
              description:
                "Up to 11 digits are read as seconds, 12 to 14 as milliseconds and 15 to 17 as microseconds; longer numbers are rejected. Spaces, underscores and commas between digits are ignored.",
            },
            {
              term: "Seconds",
              description: (
                <>
                  10 digits for dates from 2001 to 2286. Used by Unix tools, PHP’s{" "}
                  <Code>time()</Code>, Python’s <Code>int(time.time())</Code> and most APIs.
                </>
              ),
            },
            {
              term: "Milliseconds",
              description: (
                <>
                  13 digits. Used by JavaScript’s <Code>Date.now()</Code> and Java’s{" "}
                  <Code>System.currentTimeMillis()</Code>.
                </>
              ),
            },
            {
              term: "Microseconds",
              description:
                "16 digits. Common in databases and tracing tools. The UTC date keeps all 6 decimal places; the other dates are shown to the millisecond.",
            },
            {
              term: "ISO 8601",
              description: (
                <>
                  <Code>2023-11-14T22:13:20.000Z</Code>, with <Code>Z</Code> for UTC or an offset
                  such as <Code>+01:00</Code> in other zones.
                </>
              ),
            },
            {
              term: "RFC 2822",
              description: (
                <>
                  <Code>Tue, 14 Nov 2023 23:13:20 +0100</Code>, used in email headers. Shown for
                  dates from 1900.
                </>
              ),
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>The date is in 1970.</Strong> The number was probably read in the wrong unit,
              for example milliseconds read as microseconds. Check the detected unit and set it
              yourself if needed.
            </>,
            <>
              <Strong>The date is thousands of years away.</Strong> The opposite case: a millisecond
              timestamp read as seconds. Choose <Strong>Milliseconds</Strong> or{" "}
              <Strong>Detect automatically</Strong>.
            </>,
            <>
              <Strong>“Enter a whole number.”</Strong> Fractional seconds such as{" "}
              <Code>1700000000.5</Code>, as Python’s <Code>time.time()</Code> returns, aren’t
              accepted. Drop the fraction, or use milliseconds (<Code>1700000000500</Code>).
            </>,
            <>
              <Strong>“This time doesn’t exist.”</Strong> On the day clocks move forward, an hour is
              skipped (for example 02:00–03:00). The converter uses the time the same distance after
              the change.
            </>,
            <>
              <Strong>“This time happens twice.”</Strong> On the day clocks move back, an hour
              repeats. The converter uses the first occurrence.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
