import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for Hash Generator (no heavy imports: rendered at build time). */
export default function HashGeneratorContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to hash text or a file">
        <Steps
          items={[
            <>
              Tick the algorithms you need. SHA-256 is selected by default; all ticked hashes are
              shown together.
            </>,
            <>
              Type or paste text, or select <Strong>Open file</Strong>. Text hashes update as you
              type; files show progress and can be cancelled.
            </>,
            <>
              To check a download, paste its published checksum into{" "}
              <Strong>Compare with expected hash</Strong>. A match is marked on the matching row.
            </>,
            <>
              For an HMAC, turn on <Strong>HMAC</Strong> and enter the key. Choose{" "}
              <Strong>hex</Strong>, <Strong>HEX</Strong> or <Strong>Base64</Strong> output to match
              what your system expects.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="formats" title="Algorithms">
        <Facts
          items={[
            {
              term: "SHA-256",
              description:
                "64 hex characters. The standard choice for checksums, signatures and HMACs today.",
            },
            {
              term: "SHA-384 and SHA-512",
              description:
                "96 and 128 hex characters. Longer SHA-2 hashes, often faster than SHA-256 on 64-bit computers.",
            },
            {
              term: "MD5 and SHA-1",
              description:
                "32 and 40 hex characters. Broken for security: collisions can be created on purpose. Still common as checksums for detecting corruption.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="How hashing works">
        <Paragraph>
          A hash function turns any input into a fixed-length fingerprint. Changing a single bit of
          the input changes the whole hash, and the input can’t be worked out from the hash. Text is
          hashed as UTF-8 bytes, so <Code>abc</Code> gives the same SHA-256 here as{" "}
          <Code>sha256sum</Code> or <Code>shasum -a 256</Code> on the command line, as long as the
          text has no trailing newline.
        </Paragraph>
        <Paragraph>
          Files are read in 4 MB chunks in a background thread and fed to every selected hash at
          once, so memory use stays flat and very large files work.
        </Paragraph>
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>The hash differs from the command line.</Strong> Commands like{" "}
              <Code>echo abc | sha256sum</Code> include a newline. Use <Code>echo -n</Code>, or add
              the newline here.
            </>,
            <>
              <Strong>“No match.”</Strong> Check that you hashed the right file and compared with
              the right algorithm. Ticked algorithms are compared; tick the one the site published.
            </>,
            <>
              <Strong>MD5 is greyed out.</Strong> HMAC is offered for the SHA family only.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
