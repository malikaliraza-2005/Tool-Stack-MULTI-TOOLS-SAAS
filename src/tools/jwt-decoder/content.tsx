import {
  Code,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
} from "@/components/tool/content";

/** Supporting content for JWT Decoder (no heavy imports: rendered at build time). */
export default function JwtDecoderContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to decode and verify a JWT">
        <Steps
          items={[
            <>
              Paste the token. A leading <Code>Bearer </Code> and line breaks are removed for you.
            </>,
            <>
              Read the header, the payload and the claims. Time claims (<Code>exp</Code>,{" "}
              <Code>iat</Code>, <Code>nbf</Code>) are shown as dates in your time zone, and the
              badge says whether the token is valid, expired or not yet valid.
            </>,
            <>
              To check that it’s genuine, enter the secret or the public key under{" "}
              <Strong>Verify signature</Strong> and select <Strong>Verify</Strong>.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What’s inside a JWT">
        <Paragraph>
          A JSON Web Token has three parts separated by dots: a header (the algorithm, e.g.{" "}
          <Code>HS256</Code>), a payload of claims about the user or session, and a signature. The
          first two are only base64url-encoded, so anyone can read them; the signature lets the
          receiver check that the issuer created the token and nobody changed it.
        </Paragraph>
        <Paragraph>
          Verification uses the browser’s Web Crypto API through the open-source <Code>jose</Code>{" "}
          library, which loads only when you select Verify. It checks the signature only; expiry is
          shown separately by the status badge.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Supported algorithms and keys">
        <Facts
          items={[
            {
              term: "HS256, HS384, HS512",
              description: "Shared secret, entered as text.",
            },
            {
              term: "RS, PS, ES (256/384/512), EdDSA",
              description: (
                <>
                  Public key as PEM (<Code>-----BEGIN PUBLIC KEY-----</Code>), an X.509 certificate,
                  a JWK, or a JWKS (the key is chosen by <Code>kid</Code>).
                </>
              ),
            },
            {
              term: "Encrypted tokens (JWE)",
              description:
                "Tokens with five parts are encrypted; reading them needs the decryption key and isn’t supported.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“This has 2 parts.”</Strong> The token was cut off when copied, or it isn’t a
              JWT. A JWT always has three parts.
            </>,
            <>
              <Strong>“Invalid signature.”</Strong> The secret or key doesn’t match, or the token
              was changed. For HS tokens, check whether your secret is stored Base64-encoded: this
              tool uses the secret as plain text.
            </>,
            <>
              <Strong>“Key type doesn’t match algorithm.”</Strong> For example an EC key for an
              RS256 token. Use the key the issuer publishes for this algorithm.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
