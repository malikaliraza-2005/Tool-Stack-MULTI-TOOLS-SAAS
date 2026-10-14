import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "json-formatter",
  category: "developer",
  status: "live",
  name: "JSON Formatter",
  tagline:
    "Format, validate and explore JSON right in your browser. Your data never leaves your device.",
  icon: "braces",
  keywords: [
    "json beautifier",
    "json validator",
    "json viewer",
    "pretty print json",
    "json lint",
    "minify json",
    "format json",
    "jsonc",
  ],
  seo: {
    title: "JSON Formatter, Validator & Viewer (No Upload) | Sprigkit",
    description:
      "Format, validate and explore JSON in your browser. Exact error line and column, tree view, minify and sort keys. Your data never leaves your device.",
    h1: "JSON formatter, validator and viewer",
    faqs: [
      {
        q: "Is my JSON sent anywhere?",
        a: "No. Formatting and validation run in your browser, on your device. Nothing you paste or open is uploaded, stored or put in the URL, and the site’s security policy blocks the page from sending data to other servers.",
      },
      {
        q: "How do I validate JSON?",
        a: "Paste it or open a .json file. If it isn’t valid, you see the exact line and column of the first problem, and the line is highlighted in the editor. Turn on “Allow comments” to accept JSON with comments and trailing commas (JSONC), as used in many configuration files.",
      },
      {
        q: "Can I validate JSON against a JSON Schema?",
        a: "Not yet. This tool checks that the text is valid JSON syntax. Schema validation is planned as a separate tool.",
      },
      {
        q: "How large a file can it handle?",
        a: "Up to 50 MB. Inputs over 1 MB are processed in a background thread so the page stays responsive, and above 5 MB you see a note that it may be slow. Very long minified output is not shown in full, but you can copy or download it.",
      },
      {
        q: "Why does it warn about large numbers?",
        a: "JavaScript stores numbers with limited precision, so integers larger than 9,007,199,254,740,991 can silently change in many tools. Sprigkit keeps the original digits in the formatted output and tells you where such numbers are, so you know to treat them carefully in your code.",
      },
    ],
  },
  related: ["jwt-decoder", "base64-encode-decode", "diff-checker", "url-encode-decode"],
  input: {
    kind: "both",
    accepts: { mime: ["application/json"], extensions: [".json"], multiple: false },
    detect: ["json"],
  },
  limits: {
    desktop: { softBytes: 5 * MB, hardBytes: 50 * MB },
    mobile: { softBytes: 5 * MB, hardBytes: 50 * MB },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  addedAt: "2026-10-14",
  updatedAt: "2026-10-14",
};
