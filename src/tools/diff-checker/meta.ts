import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "diff-checker",
  category: "developer",
  status: "live",
  name: "Diff Checker",
  tagline:
    "Compare two texts or files and see every change, line by line and word by word. Everything runs in your browser.",
  icon: "git-compare",
  keywords: [
    "compare text",
    "text compare",
    "diff tool",
    "compare two files",
    "text difference",
    "online diff",
    "unified diff",
    "word diff",
  ],
  seo: {
    title: "Diff Checker: Compare Text and Files (No Upload) | Sprigkit",
    description:
      "Compare two texts or files side by side with line, word and character highlights. Ignore whitespace or case, copy a unified diff. Nothing is uploaded.",
    h1: "Diff checker: compare text and files",
    faqs: [
      {
        q: "How do I compare two files?",
        a: "Select Open file above Original and choose the first file, then Open file above Changed for the second. The differences appear below as soon as both are loaded: removed lines in red with a minus sign, added lines in green with a plus sign, and the changed words highlighted within each line.",
      },
      {
        q: "Can I ignore whitespace or letter case?",
        a: "Yes. Turn on Ignore whitespace to treat lines as equal when they differ only in spaces, tabs or indentation, and Ignore case to treat upper and lower case as equal. Each side still shows its own text.",
      },
      {
        q: "Is my text uploaded?",
        a: "No. The comparison runs in a background thread in your browser, on your device. Nothing you paste or open is uploaded, stored or put in the URL, and the site’s security policy blocks the page from sending data to other servers.",
      },
      {
        q: "Can I see word-level differences?",
        a: "Yes, and it’s free. Choose Word to highlight the changed words within each changed line, Character for single-character edits, or Line to mark whole lines only.",
      },
      {
        q: "Can I get the changes as a patch?",
        a: "Yes. Copy unified diff (or download changes.diff) gives the standard format used by diff -u, git diff and patch, with 3 lines of context around each change.",
      },
    ],
  },
  related: ["json-formatter", "regex-tester", "hash-generator", "base64-encode-decode"],
  input: {
    kind: "both",
    accepts: { mime: ["text/plain"], extensions: [".txt"], multiple: false },
  },
  limits: {
    desktop: { softBytes: 5 * MB, hardBytes: 50 * MB },
    mobile: { softBytes: 2 * MB, hardBytes: 20 * MB },
  },
  processing: { local: true, worker: true, offline: true },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
