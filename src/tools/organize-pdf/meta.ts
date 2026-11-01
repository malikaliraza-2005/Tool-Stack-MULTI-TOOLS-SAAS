import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "organize-pdf",
  category: "pdf",
  status: "live",
  name: "Organize PDF",
  tagline:
    "Reorder, rotate and delete PDF pages by dragging thumbnails, right in your browser. Nothing is uploaded.",
  icon: "layout-grid",
  keywords: [
    "rearrange pdf pages",
    "reorder pdf pages",
    "rotate pdf",
    "delete pdf pages",
    "remove pages from pdf",
    "sort pdf pages",
    "pdf page organizer",
  ],
  seo: {
    title: "Organize PDF: Reorder, Rotate, Delete Pages | Sprigkit",
    description:
      "Rearrange, rotate and delete PDF pages with drag-and-drop thumbnails, undo and redo. Works in your browser; your file is never uploaded.",
    h1: "Organize PDF pages",
    faqs: [
      {
        q: "How do I rearrange pages in a PDF?",
        a: "Choose the PDF, then drag a page thumbnail to its new place (on a phone or tablet, press and hold first). To move several pages at once, select them with Ctrl/⌘-click or Shift-click and drag one of them. With the keyboard, select a page and press Ctrl with an arrow key.",
      },
      {
        q: "How do I rotate a single page?",
        a: "Select the page and choose Rotate left or Rotate right, or press R (Shift+R rotates left). Each press turns the page 90°. Rotate several pages at once by selecting them first.",
      },
      {
        q: "How do I delete pages from a PDF?",
        a: "Select the pages and choose Delete, or press the Delete key. A PDF needs at least one page, so the last page can’t be deleted. Undo (Ctrl+Z) brings deleted pages back until you save.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Thumbnails are drawn and the new PDF is built in your browser, on your device. The file is never uploaded or stored, and the site’s security policy blocks the page from sending data to other servers.",
      },
      {
        q: "Does it work with large PDFs?",
        a: "Yes. Only the thumbnails you can see are drawn, so documents with hundreds of pages stay responsive. Files up to 500 MB work on computers and up to 150 MB on phones and tablets.",
      },
    ],
  },
  related: ["merge-pdf", "split-pdf", "sign-pdf", "pdf-to-jpg"],
  input: {
    kind: "files",
    accepts: { mime: ["application/pdf"], extensions: [".pdf"], multiple: false },
  },
  limits: {
    desktop: { softBytes: 100 * MB, hardBytes: 500 * MB, maxFiles: 1 },
    mobile: { softBytes: 50 * MB, hardBytes: 150 * MB, maxFiles: 1 },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  handoff: ["sign-pdf", "split-pdf", "pdf-to-jpg"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
