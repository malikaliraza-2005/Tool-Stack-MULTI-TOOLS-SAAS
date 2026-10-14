import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "merge-pdf",
  category: "pdf",
  status: "live",
  name: "Merge PDF",
  tagline: "Combine PDF files into one document, right in your browser. Nothing is uploaded.",
  icon: "files",
  keywords: ["combine pdf", "join pdf", "merge pdf files", "pdf merger", "append pdf", "pdf"],
  seo: {
    title: "Merge PDF Online: Private, No Upload | Sprigkit",
    description:
      "Combine multiple PDF files into one in seconds. Files are processed on your device and never uploaded. Free, no sign-up.",
    h1: "Merge PDF files",
    faqs: [
      {
        q: "Are my PDF files uploaded to a server?",
        a: "No. Sprigkit merges your PDFs inside your browser, on your device. The files are never sent anywhere, and the site’s security policy blocks the page from sending data to other servers. You can check this in your browser’s developer tools: open the Network tab and merge your files.",
      },
      {
        q: "Can I merge password-protected PDFs?",
        a: "Not yet. A password-protected file is marked in the list and left out; the other files stay usable. Remove the password first (for example, open the file in a PDF reader that knows the password and save it as a new PDF), then add it again.",
      },
      {
        q: "Is there a limit on the number or size of files?",
        a: "On a computer you can merge up to 100 files with a total of 500 MB; on phones and tablets, up to 50 files and 150 MB. Above 100 MB (50 MB on phones and tablets) merging still works but can be slow, because everything happens in your device’s memory.",
      },
      {
        q: "Does merging keep bookmarks and form fields?",
        a: "Every page keeps its size, orientation and content. Bookmarks (the document outline) and fillable form fields are not guaranteed to carry over into the merged file.",
      },
      {
        q: "Do I need to sign up or install anything?",
        a: "No. Merge PDF is free, has no account, and runs in a current version of Chrome, Edge, Firefox or Safari.",
      },
    ],
  },
  related: ["split-pdf", "organize-pdf", "jpg-to-pdf", "sign-pdf"],
  input: {
    kind: "files",
    accepts: { mime: ["application/pdf"], extensions: [".pdf"], multiple: true },
  },
  limits: {
    desktop: { softBytes: 100 * MB, hardBytes: 500 * MB, maxFiles: 100 },
    mobile: { softBytes: 50 * MB, hardBytes: 150 * MB, maxFiles: 50 },
    per: "total",
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  handoff: ["organize-pdf", "sign-pdf", "split-pdf"],
  addedAt: "2026-10-14",
  updatedAt: "2026-10-14",
};
