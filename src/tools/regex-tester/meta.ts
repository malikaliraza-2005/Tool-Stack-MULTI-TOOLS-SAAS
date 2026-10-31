import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "regex-tester",
  category: "developer",
  status: "live",
  name: "Regex Tester",
  tagline:
    "Test JavaScript regular expressions with live highlighting, groups, replace and a plain-language explanation. Runs in your browser.",
  icon: "regex",
  keywords: [
    "regular expression tester",
    "regex test",
    "javascript regex",
    "regex replace",
    "regex groups",
    "regex explainer",
    "regexp",
    "regex debugger",
  ],
  seo: {
    title: "Regex Tester for JavaScript, with Explanation | Sprigkit",
    description:
      "Test JavaScript regular expressions live: highlighted matches, numbered and named groups, replace preview and a plain-language explanation. No upload.",
    h1: "Regex tester (JavaScript)",
    faqs: [
      {
        q: "Which regex flavor does this use?",
        a: "JavaScript (ECMAScript), exactly as your browser runs it, so results match RegExp, String.match, matchAll and replace in your code. All current flags are supported: g, i, m, s, u, v, y and d (v where the browser supports it).",
      },
      {
        q: "Why does my regex work here but not in Python?",
        a: "Regex flavors differ. Python, PCRE (PHP), Java and .NET support features JavaScript doesn’t, such as possessive quantifiers or inline flags like (?i) in older engines, and some syntax differs, such as named groups written (?P<name>…) in Python. Patterns made of common building blocks behave the same everywhere; test anything advanced in the target language too.",
      },
      {
        q: "What do the flags mean?",
        a: "g finds all matches instead of the first; i ignores case; m makes ^ and $ match at line breaks; s lets . match line breaks; u enables full Unicode, including \\p{…} classes; v is a stricter, newer form of u with set operations; y matches only at the position where the last match ended (sticky); d records where each group matched.",
      },
      {
        q: "Why did my regex time out?",
        a: "Some patterns, such as (a+)+$, can try an enormous number of ways to match before failing: catastrophic backtracking. Every test runs in a background thread that is stopped after 1 second, so the page never freezes. Make quantifiers more specific, avoid nested repetition of the same characters, and anchor the pattern where you can.",
      },
      {
        q: "Is my text uploaded?",
        a: "No. The pattern and the text are tested in your browser, on your device. Nothing is uploaded, stored or put in the URL. Only your flag and mode choices are remembered on this device.",
      },
    ],
  },
  related: ["diff-checker", "json-formatter", "url-encode-decode", "base64-encode-decode"],
  input: { kind: "text" },
  limits: {
    desktop: { softBytes: 1 * MB, hardBytes: 10 * MB },
    mobile: { softBytes: 1 * MB, hardBytes: 10 * MB },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
