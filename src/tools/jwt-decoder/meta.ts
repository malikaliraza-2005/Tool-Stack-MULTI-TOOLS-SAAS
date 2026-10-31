import type { ToolDefinition } from "../types";

const KB = 2 ** 10;
const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "jwt-decoder",
  category: "developer",
  status: "live",
  name: "JWT Decoder",
  tagline:
    "Decode a JSON Web Token’s header and claims, see when it expires, and verify its signature, all in your browser. Tokens never leave your device.",
  icon: "key-round",
  keywords: [
    "jwt decode",
    "decode jwt",
    "jwt verify",
    "jwt token decoder",
    "jwt parser",
    "jwt debugger",
    "json web token",
    "decode jwt locally",
  ],
  seo: {
    title: "JWT Decoder & Verifier, Local and Private | Sprigkit",
    description:
      "Decode JSON Web Tokens in your browser: header, payload, exp, iat and nbf in readable time. Verify HS, RS, PS, ES and EdDSA signatures. No upload.",
    h1: "JWT decoder and verifier",
    faqs: [
      {
        q: "Is it safe to paste a JWT here?",
        a: "Yes. The token is decoded in your browser, on your device. It isn’t uploaded, stored, logged or put in the URL, and the site’s security policy blocks the page from sending data to other servers. Still, treat tokens like passwords: a valid token gives access to whatever it was issued for, so don’t paste production tokens into tools you can’t check.",
      },
      {
        q: "Can a JWT be decoded without the secret?",
        a: "Yes. The header and payload are only base64url-encoded, not encrypted, so anyone holding the token can read them. The secret or key is needed only to verify the signature, which proves who issued the token and that it wasn’t changed. Never put confidential data in a JWT payload.",
      },
      {
        q: "How do I verify the signature?",
        a: "Paste the token, then enter the secret (for HS256, HS384, HS512) or the issuer’s public key (for RS, PS, ES and EdDSA algorithms) under Verify signature. Keys can be PEM, a certificate, a JWK or a JWKS, for example from the issuer’s /.well-known/jwks.json. You then see “Signature verified” or “Invalid signature”.",
      },
      {
        q: "How do I check if a token is expired?",
        a: "The status badge shows Valid, Expired or Not yet valid, based on the exp and nbf claims and your device’s clock. Each time claim is shown as a date in your time zone with a relative time such as “expired 3 hours ago”. This is a time check only; it doesn’t say the token is genuine.",
      },
      {
        q: "What is the difference between decoding and verifying?",
        a: "Decoding reads what the token says. Verifying checks the signature with the key, proving the token was issued by the key’s owner and not altered. A decoded token can be forged by anyone; only a verified one can be trusted. Tokens with alg: none have no signature at all and should always be rejected.",
      },
    ],
  },
  related: ["base64-encode-decode", "json-formatter", "unix-timestamp-converter", "hash-generator"],
  input: { kind: "text", detect: ["jwt"] },
  limits: {
    desktop: { softBytes: 64 * KB, hardBytes: 1 * MB },
    mobile: { softBytes: 64 * KB, hardBytes: 1 * MB },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: false, offline: false },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
