import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for URL Encode & Decode (no heavy imports: rendered at build time). */
export default function UrlEncodeDecodeContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to encode, decode or parse a URL">
        <Steps
          items={[
            <>
              Choose <Strong>Encode</Strong>, <Strong>Decode</Strong> or <Strong>Parse</Strong>. The
              result updates as you type.
            </>,
            <>
              To encode a single value, such as a query parameter, keep <Strong>Component</Strong>.
              To make a whole address safe while keeping its <Code>/</Code>, <Code>?</Code> and{" "}
              <Code>&amp;</Code>, choose <Strong>Full URL</Strong>.
            </>,
            <>
              To decode, paste the encoded text. Turn on <Strong>+ as space</Strong> for query
              strings and form data.
            </>,
            <>
              To parse, paste a full URL. You get the scheme, host, port, path, each query parameter
              decoded, and the fragment, each with a copy button.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "Component",
              description: (
                <>
                  Like JavaScript’s <Code>encodeURIComponent</Code>: encodes everything except
                  letters, digits and <Code>- _ . ! ~ * &apos; ( )</Code>.
                </>
              ),
            },
            {
              term: "Full URL",
              description: (
                <>
                  Like <Code>encodeURI</Code>: also keeps the characters that structure a URL, such
                  as <Code>: / ? # &amp; =</Code>.
                </>
              ),
            },
            {
              term: "Space as +",
              description: (
                <>
                  Writes spaces as <Code>+</Code>, as HTML forms do. A real plus sign is still
                  encoded as <Code>%2B</Code>. Only for Component.
                </>
              ),
            },
            {
              term: "+ as space",
              description: (
                <>
                  When decoding, reads <Code>+</Code> as a space. <Code>%2B</Code> still decodes to
                  a plus sign.
                </>
              ),
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How percent-encoding works">
        <Paragraph>
          URLs may contain only a limited set of ASCII characters, and some of those, such as{" "}
          <Code>&amp;</Code>, <Code>=</Code> and <Code>#</Code>, separate the parts of the URL.
          Percent-encoding writes any other character as its UTF-8 bytes in hex: a space becomes{" "}
          <Code>%20</Code>, <Code>ü</Code> becomes <Code>%C3%BC</Code>, and 👋 becomes{" "}
          <Code>%F0%9F%91%8B</Code>.
        </Paragraph>
        <Paragraph>
          Parsing uses the same URL rules as the browser. International domain names are shown both
          as typed (<Code>münchen.de</Code>) and in the ASCII form browsers send (punycode,{" "}
          <Code>xn--mnchen-3ya.de</Code>).
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… isn’t a valid escape.”</Strong> A <Code>%</Code> must be followed by two
              hex digits. Write a literal percent sign as <Code>%25</Code>.
            </>,
            <>
              <Strong>“… isn’t valid UTF-8.”</Strong> The text was probably encoded with another
              character set, such as Latin-1 (<Code>caf%E9</Code> instead of <Code>caf%C3%A9</Code>
              ), or cut off in the middle of a character.
            </>,
            <>
              <Strong>“This URL has no scheme.”</Strong> Parsing needs the full address, including{" "}
              <Code>https://</Code>.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
