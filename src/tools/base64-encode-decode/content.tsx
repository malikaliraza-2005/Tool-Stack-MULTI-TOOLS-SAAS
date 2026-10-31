import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for Base64 Encode & Decode (no heavy imports: rendered at build time). */
export default function Base64Content() {
  return (
    <>
      <ContentSection id="how-to" title="How to encode or decode Base64">
        <Steps
          items={[
            <>
              Choose <Strong>Encode</Strong> or <Strong>Decode</Strong>. The output updates as you
              type.
            </>,
            <>
              To encode, type or paste text, or select <Strong>Open file</Strong> for an image, PDF
              or any other file. Turn on <Strong>Data URL</Strong> to get a{" "}
              <Code>data:…;base64,…</Code> string.
            </>,
            <>
              To decode, paste Base64 or a data URL. Text is shown as text; anything else, such as
              an image, is offered as a download with its file type detected.
            </>,
            <>
              Copy or download the result. <Strong>Swap</Strong> moves the output to the input and
              switches the mode, to check a round trip.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "URL-safe",
              description: (
                <>
                  Uses <Code>-</Code> and <Code>_</Code> instead of <Code>+</Code> and{" "}
                  <Code>/</Code>, without <Code>=</Code> padding (base64url, RFC 4648 §5), as in
                  JWTs and URLs. Decoding accepts both alphabets, with or without padding.
                </>
              ),
            },
            {
              term: "Wrap at 76",
              description:
                "Breaks the output into lines of 76 characters, as MIME email does. Line breaks and spaces are ignored when decoding.",
            },
            {
              term: "Data URL",
              description:
                "For files: adds the data: prefix with the file’s type, ready for an HTML src or a CSS url(). Data URLs always use the standard alphabet on one line.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What Base64 is">
        <Paragraph>
          Base64 writes any bytes using 64 safe characters: A–Z, a–z, 0–9, <Code>+</Code> and{" "}
          <Code>/</Code>. Every 3 bytes become 4 characters, so the result is about a third larger
          than the original, and <Code>=</Code> pads the end when the length isn’t a multiple of 3.
          It carries binary data through text-only channels such as email, JSON and URLs. It is not
          encryption: anyone can decode it.
        </Paragraph>
        <Paragraph>
          Text is encoded as UTF-8, so emoji and every script round-trip exactly: “Grüße 👋” becomes{" "}
          <Code>R3LDvMOfZSDwn5GL</Code>.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            {
              term: "Input",
              description:
                "Text (UTF-8), any file for encoding, and Base64 or data URLs for decoding.",
            },
            {
              term: "Size",
              description:
                "Up to 50 MB. Files and inputs over 1 MB are processed in a background thread, so the page stays responsive; above 5 MB it may be slow.",
            },
            {
              term: "Detected file types",
              description:
                "PDF, JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP, ZIP and gzip, from their first bytes. Other data uses the data URL’s type, or downloads as .bin.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… isn’t a Base64 character.”</Strong> The message gives the line and column.
              Quotes copied with the value, or <Code>%2B</Code>-style URL encoding, are common
              causes. Select <Strong>Go to error</Strong> to jump there.
            </>,
            <>
              <Strong>“… can’t be complete.”</Strong> One character too many or several missing: the
              Base64 was probably cut off when it was copied.
            </>,
            <>
              <Strong>The output is a download, not text.</Strong> The decoded bytes aren’t valid
              UTF-8 text, so showing them would only show garbled characters. Download the file
              instead.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
