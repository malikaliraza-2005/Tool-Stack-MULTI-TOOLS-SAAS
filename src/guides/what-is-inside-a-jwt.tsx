import {
  Code,
  CodeBlock,
  ContentSection,
  Facts,
  List,
  Paragraph,
  Strong,
  TextLink,
} from "@/components/tool/content";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "what-is-inside-a-jwt",
  title: "What’s Inside a JWT, and Is It Safe to Decode? | Sprigkit",
  description:
    "A JSON Web Token is readable by anyone who has it. What its header, claims and signature mean, decoding versus verifying, and how to inspect a token safely.",
  h1: "What’s inside a JWT, and is it safe to decode one?",
  summary:
    "A JWT looks scrambled, but most of it is plain JSON that anyone can read. Here is what each part means and how to inspect a token without leaking it.",
  author: "Ali Raza",
  published: "2026-11-02",
  updated: "2026-11-02",
  tools: ["jwt-decoder", "base64-encode-decode", "unix-timestamp-converter"],
  sources: [
    {
      title: "RFC 7519: JSON Web Token (JWT)",
      publisher: "IETF",
      url: "https://www.rfc-editor.org/rfc/rfc7519",
    },
    {
      title: "RFC 7515: JSON Web Signature (JWS)",
      publisher: "IETF",
      url: "https://www.rfc-editor.org/rfc/rfc7515",
    },
    {
      title: "RFC 8725: JSON Web Token Best Current Practices",
      publisher: "IETF",
      url: "https://www.rfc-editor.org/rfc/rfc8725",
    },
  ],
};

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQyIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjoxNzY3MjI5MjAwfQ.A7UhKa4T-XotS2A64vUN6FfQ496oqPotU5k41hreECc";

export default function WhatIsInsideAJwt() {
  return (
    <>
      <ContentSection id="three-parts" title="Three parts, separated by dots">
        <Paragraph>
          This is a complete JWT, signed with the secret <Code>example-secret</Code>:
        </Paragraph>
        <CodeBlock>{TOKEN}</CodeBlock>
        <Paragraph>
          It is three pieces of base64url text joined by dots: header, payload and signature.
          Base64url is Base64 with <Code>-</Code> and <Code>_</Code> in place of <Code>+</Code> and{" "}
          <Code>/</Code>, and without padding (RFC 7515). It is an encoding, not encryption, so the
          first two parts decode straight back to JSON:
        </Paragraph>
        <CodeBlock>
          {`{ "alg": "HS256", "typ": "JWT" }

{
  "sub": "user-42",
  "name": "Ada Lovelace",
  "iat": 1767225600,
  "exp": 1767229200
}`}
        </CodeBlock>
        <Paragraph>
          The header says how the token is signed, here with HMAC-SHA256. The payload holds the{" "}
          <Strong>claims</Strong>: statements about the user or session. The third part is the
          signature, computed over the first two.
        </Paragraph>
      </ContentSection>

      <ContentSection id="claims" title="What the standard claims mean">
        <Paragraph>
          RFC 7519 registers seven claim names. All are optional; apps add their own, such as{" "}
          <Code>name</Code> or <Code>role</Code>.
        </Paragraph>
        <Facts
          items={[
            { term: <Code>iss</Code>, description: "Issuer: who created the token." },
            { term: <Code>sub</Code>, description: "Subject: who it is about, usually a user ID." },
            { term: <Code>aud</Code>, description: "Audience: who it is meant for." },
            {
              term: <Code>exp</Code>,
              description: "Expiration time: the token must not be accepted after it.",
            },
            { term: <Code>nbf</Code>, description: "Not before: it must not be accepted earlier." },
            { term: <Code>iat</Code>, description: "Issued at: when it was created." },
            { term: <Code>jti</Code>, description: "JWT ID: a unique identifier for the token." },
          ]}
        />
        <Paragraph>
          The times are “NumericDate” values: seconds since January 1, 1970, UTC. In the example,{" "}
          <Code>iat</Code> 1767225600 is January 1, 2026, 00:00 UTC and <Code>exp</Code> is one hour
          later. The <TextLink href="/unix-timestamp-converter">Unix Timestamp Converter</TextLink>{" "}
          turns such numbers into dates.
        </Paragraph>
      </ContentSection>

      <ContentSection id="decode-verify" title="Decoding is not verifying">
        <Paragraph>
          Anyone can decode a JWT; no secret is needed. That is why a payload must never hold
          passwords or other secrets. What the secret or key gives you is{" "}
          <Strong>verification</Strong>: recomputing the signature proves that the token was issued
          by someone holding the key and that nobody changed a single character since.
        </Paragraph>
        <List
          items={[
            <>
              <Strong>HS256, HS384, HS512</Strong> use one shared secret to sign and verify.
            </>,
            <>
              <Strong>RS, PS, ES and EdDSA</Strong> sign with a private key and verify with the
              matching public key, which can be shared openly.
            </>,
            <>
              A token with <Code>&quot;alg&quot;: &quot;none&quot;</Code> has no signature at all.
              RFC 8725 tells applications to accept only the algorithms they expect, so a token
              can’t choose a weaker check for itself.
            </>,
          ]}
        />
        <Paragraph>
          A valid signature doesn’t make a token current. Expiry is a separate check against{" "}
          <Code>exp</Code> and <Code>nbf</Code>, which the receiving application must do too.
        </Paragraph>
      </ContentSection>

      <ContentSection id="safety" title="Is it safe to paste a token into a website?">
        <Paragraph>
          A JWT is usually a bearer credential: whoever holds it can act as you until it expires.
          Pasting a live token into a site that sends it to a server hands that power to the server,
          its logs and anyone who can read them.
        </Paragraph>
        <List
          items={[
            <>
              Prefer a decoder that works locally. The{" "}
              <TextLink href="/jwt-decoder">JWT Decoder</TextLink> runs in your browser and makes no
              network request with the token; you can check this in the developer tools’ Network
              tab.
            </>,
            "Decode copies of tokens from test systems when you can, rather than production tokens.",
            "If a production token was exposed, revoke it or let it expire, and sign in again for a new one.",
          ]}
        />
      </ContentSection>

      <ContentSection id="by-hand" title="Decoding a token by hand">
        <Paragraph>
          To read a payload without any JWT tool, take the middle part, the text between the two
          dots, and decode it as Base64 with the URL-safe alphabet. The{" "}
          <TextLink href="/base64-encode-decode">Base64 Encode &amp; Decode</TextLink> tool accepts
          base64url and missing padding, so you can paste the part as it is.
        </Paragraph>
      </ContentSection>
    </>
  );
}
