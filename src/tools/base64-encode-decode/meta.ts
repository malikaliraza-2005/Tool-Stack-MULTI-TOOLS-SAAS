import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "base64-encode-decode",
  category: "developer",
  status: "live",
  name: "Base64 Encode & Decode",
  tagline:
    "Encode text or files to Base64 and decode Base64 back, right in your browser. Your data never leaves your device.",
  icon: "binary",
  keywords: [
    "base64 decode",
    "base64 encode",
    "base64 decoder",
    "base64 encoder",
    "base64 to image",
    "image to base64",
    "data url",
    "base64url",
  ],
  seo: {
    title: "Base64 Encode & Decode: Text and Files (No Upload) | Sprigkit",
    description:
      "Encode and decode Base64 in your browser: text with emoji, URL-safe Base64, data URLs and files. Errors show the exact position. Nothing is uploaded.",
    h1: "Base64 encode and decode",
    faqs: [
      {
        q: "Is my data uploaded when I decode Base64?",
        a: "No. Encoding and decoding run in your browser, on your device. Nothing you paste or open is uploaded, stored or put in the URL, and the site’s security policy blocks the page from sending data to other servers. That makes it safe for tokens, keys and private files.",
      },
      {
        q: "How do I decode Base64 to an image or file?",
        a: "Choose Decode and paste the Base64 or a data URL (data:image/png;base64,…). If the result isn’t text, the tool detects the file type from its first bytes, for example a PNG or a PDF, and offers it as a download with the right extension.",
      },
      {
        q: "How do I convert an image or file to Base64?",
        a: "Choose Encode and select Open file. You get the file as Base64, or turn on “Data URL” to get a data:…;base64,… string you can paste into HTML or CSS. Files up to 50 MB are processed in a background thread.",
      },
      {
        q: "What is URL-safe Base64?",
        a: "Standard Base64 uses “+” and “/”, which have special meanings in URLs and file names. URL-safe Base64 (base64url, RFC 4648) uses “-” and “_” instead and usually drops the “=” padding. It’s used in JWTs and many web APIs. The decoder accepts both forms automatically.",
      },
      {
        q: "Why does decoding fail with “isn’t a Base64 character”?",
        a: "Base64 contains only letters, digits, “+” and “/” (or “-” and “_”), with up to two “=” at the end. The message shows the line and column of the first character that doesn’t belong, often a quote, a stray space inside a word, or a “%” from URL encoding. Line breaks and spaces between lines are ignored.",
      },
      {
        q: "Is Base64 encryption?",
        a: "No. Base64 is an encoding: anyone can decode it, without a key. It exists to carry binary data through systems that expect text, such as email, JSON and URLs. Don’t use it to hide passwords or secrets.",
      },
    ],
  },
  related: ["url-encode-decode", "jwt-decoder", "hash-generator", "json-formatter"],
  input: {
    kind: "both",
    // Encode accepts any file; Decode opens Base64 saved as text.
    accepts: { mime: ["*/*"], extensions: [".txt"], multiple: false },
    detect: ["base64"],
  },
  limits: {
    desktop: { softBytes: 5 * MB, hardBytes: 50 * MB },
    mobile: { softBytes: 5 * MB, hardBytes: 50 * MB },
  },
  processing: { local: true, worker: true, offline: true },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
