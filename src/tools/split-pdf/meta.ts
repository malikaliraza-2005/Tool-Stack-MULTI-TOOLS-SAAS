import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "split-pdf",
  category: "pdf",
  status: "live",
  name: "Split PDF",
  tagline:
    "Extract pages from a PDF or split it into several files, right in your browser. Nothing is uploaded.",
  icon: "scissors",
  keywords: [
    "extract pages from pdf",
    "split pdf pages",
    "separate pdf pages",
    "pdf splitter",
    "split pdf into multiple files",
    "save one page of pdf",
    "cut pdf",
  ],
  seo: {
    title: "Split PDF & Extract Pages (No Upload) | Sprigkit",
    description:
      "Extract pages from a PDF or split it every N pages or into single pages, in your browser. Files never leave your device. Free, no sign-up.",
    h1: "Split PDF and extract pages",
    faqs: [
      {
        q: "How do I split a PDF into separate pages?",
        a: "Choose your PDF, select “Single pages” and then Split. You get one PDF per page, named like report-page-7.pdf, in a ZIP file. To keep pages together in groups, choose “Every N pages” instead, for example every 2 pages for double-sided scans.",
      },
      {
        q: "How do I extract pages into a new PDF?",
        a: "Choose “Extract pages” (the default) and type the pages you want, for example 1-3, 5, 8-. Ranges use a dash, pages are separated by commas, and “8-” means page 8 to the end. The pages are copied into one new PDF in the order you typed them.",
      },
      {
        q: "Can I split a PDF without uploading it?",
        a: "Yes. Splitting runs in your browser, on your device. The PDF is never uploaded or stored, and the site’s security policy blocks the page from sending data to other servers.",
      },
      {
        q: "Is there a size limit?",
        a: "Up to 500 MB on computers and 150 MB on phones and tablets. Above 100 MB (50 MB on phones) it may be slow, depending on your device’s memory.",
      },
      {
        q: "How do I split a PDF on iPhone?",
        a: "Open this page in Safari, tap Choose file and pick the PDF from Files. After splitting, tap Download: a single PDF opens in the viewer, where you can save it to Files; several parts download as a ZIP file that Files can open.",
      },
    ],
  },
  related: ["merge-pdf", "organize-pdf", "pdf-to-jpg", "sign-pdf"],
  input: {
    kind: "files",
    accepts: { mime: ["application/pdf"], extensions: [".pdf"], multiple: false },
  },
  limits: {
    desktop: { softBytes: 100 * MB, hardBytes: 500 * MB, maxFiles: 1 },
    mobile: { softBytes: 50 * MB, hardBytes: 150 * MB, maxFiles: 1 },
  },
  processing: { local: true, worker: true, offline: true },
  handoff: ["merge-pdf", "organize-pdf"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
