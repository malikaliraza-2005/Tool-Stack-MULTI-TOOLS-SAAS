import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "pdf-to-jpg",
  category: "pdf",
  status: "live",
  name: "PDF to JPG",
  tagline:
    "Turn PDF pages into JPG or PNG images at the resolution you need, right in your browser. Nothing is uploaded.",
  icon: "file-image",
  keywords: [
    "pdf to image",
    "pdf to png",
    "convert pdf to jpg",
    "pdf page to image",
    "pdf to jpeg",
    "save pdf as image",
    "extract images from pdf pages",
  ],
  seo: {
    title: "PDF to JPG & PNG: Convert Pages to Images (No Upload) | Sprigkit",
    description:
      "Convert PDF pages to JPG or PNG at 72, 150 or 300 DPI, all pages or a range. Your PDF stays on your device; nothing is uploaded.",
    h1: "PDF to JPG and PNG",
    faqs: [
      {
        q: "How do I convert a PDF page to an image?",
        a: "Choose the PDF, pick JPG or PNG and a resolution, then select all pages or type a range such as 1-3, 5. Convert, then download one image, or all of them as a ZIP file.",
      },
      {
        q: "Which resolution should I choose?",
        a: "150 DPI suits screens, documents and sharing. 300 DPI gives print-quality images, with files about four times larger. 72 DPI makes small previews. On phones, very large pages may be reduced to fit the device’s memory; the result tells you when that happened.",
      },
      {
        q: "JPG or PNG?",
        a: "JPG gives smaller files and suits photos and scans. PNG is lossless, so text and line drawings stay perfectly sharp, but files are larger.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Pages are drawn into images in your browser, on your device. The PDF is never uploaded or stored, and the site’s security policy blocks the page from sending data to other servers.",
      },
      {
        q: "Can I convert a password-protected PDF?",
        a: "Not yet. Remove the password in a PDF reader first (open it with the password, then save or print it as a new PDF), then convert that copy.",
      },
    ],
  },
  related: ["jpg-to-pdf", "split-pdf", "compress-image", "organize-pdf"],
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
  handoff: ["compress-image", "resize-image"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
