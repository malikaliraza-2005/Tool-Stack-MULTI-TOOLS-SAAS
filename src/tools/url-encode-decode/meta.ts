import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "url-encode-decode",
  category: "developer",
  status: "live",
  name: "URL Encode & Decode",
  tagline:
    "Encode and decode URLs and query strings, or split a URL into its parts. Right in your browser; nothing is uploaded.",
  icon: "link",
  keywords: [
    "url encoder",
    "url decoder",
    "url encode",
    "url decode",
    "percent encoding",
    "url parser",
    "query string",
    "encodeuricomponent",
  ],
  seo: {
    title: "URL Encode & Decode, plus URL Parser (No Upload) | Sprigkit",
    description:
      "Percent-encode or decode text and URLs, with %20 or + for spaces. Parse any URL into host, path and query parameters. Runs in your browser.",
    h1: "URL encode and decode",
    faqs: [
      {
        q: "How do I URL-encode a space: %20 or +?",
        a: "Both are used. %20 is correct anywhere in a URL. + means a space only in query strings and HTML form data (application/x-www-form-urlencoded). Choose “Space as +” when you are building form data or a query string for a server that expects it; otherwise keep %20.",
      },
      {
        q: "What characters need URL encoding?",
        a: "Everything except letters, digits and - _ . ~ when you encode a single value, such as a query parameter. Characters like & = ? / # have a meaning in URLs, so a value containing them must be encoded, or the URL will be read differently. Non-ASCII characters, such as ü or emoji, are encoded as their UTF-8 bytes, for example ü becomes %C3%BC.",
      },
      {
        q: "What is the difference between encodeURI and encodeURIComponent?",
        a: "encodeURIComponent encodes a single part, such as one query value, and escapes the characters that separate URL parts (: / ? # & =). encodeURI encodes a whole URL and leaves those separators alone, so the URL keeps working. Use “Component” for values and “Full URL” for complete addresses with spaces or non-ASCII characters.",
      },
      {
        q: "Why does decoding fail?",
        a: "Either a “%” isn’t followed by two hex digits (a literal percent sign must be written %25), or the escapes don’t form valid UTF-8, for example text encoded with an older character set such as Latin-1. The error shows the line and column of the first problem.",
      },
      {
        q: "Can it decode Safe Links or Proofpoint URLs?",
        a: "Decoding shows the readable text of an encoded link, including the target address inside a wrapped link. Unwrapping vendor-specific formats automatically isn’t supported; use Parse to see the target in the query parameters.",
      },
      {
        q: "Is my URL sent anywhere?",
        a: "No. Encoding, decoding and parsing run in your browser, on your device. Nothing is uploaded, stored or put in the address bar, and the page doesn’t open the URL you parse. Passwords in URLs are hidden on screen.",
      },
    ],
  },
  related: ["base64-encode-decode", "json-formatter", "jwt-decoder", "hash-generator"],
  input: { kind: "text", detect: ["url", "url-encoded"] },
  limits: {
    desktop: { softBytes: 1 * MB, hardBytes: 10 * MB },
    mobile: { softBytes: 1 * MB, hardBytes: 10 * MB },
  },
  processing: { local: true, worker: false, offline: true },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
