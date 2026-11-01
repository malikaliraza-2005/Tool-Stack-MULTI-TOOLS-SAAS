import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "jpg-to-pdf",
  category: "pdf",
  status: "live",
  name: "JPG to PDF",
  tagline:
    "Turn JPG, PNG and other images into one PDF, one page per image, right in your browser. Nothing is uploaded.",
  icon: "image",
  keywords: [
    "image to pdf",
    "png to pdf",
    "photo to pdf",
    "jpg to pdf converter",
    "combine images into pdf",
    "pictures to pdf",
    "webp to pdf",
    "jpeg to pdf",
  ],
  seo: {
    title: "JPG to PDF: Combine Images into a PDF (No Upload) | Sprigkit",
    description:
      "Convert JPG, PNG, WebP and other images to one PDF. Choose page size, orientation and margins; photos stay upright. Works in your browser.",
    h1: "JPG and other images to PDF",
    faqs: [
      {
        q: "Can I combine several JPGs into one PDF?",
        a: "Yes. Choose or drop all the images at once; each becomes one page, in the order shown. Drag the files, or use their arrow buttons, to change the order before converting.",
      },
      {
        q: "Does it work with PNG and iPhone photos?",
        a: "PNG, WebP, GIF (first frame), BMP and AVIF work in every current browser, and transparent PNGs keep their transparency. iPhone HEIC photos work in Safari; in other browsers, save them as JPG first (Settings › Camera › Formats › Most Compatible). Full HEIC support for every browser is coming.",
      },
      {
        q: "Can I convert without uploading?",
        a: "Yes, that’s the only way it works here. The images are read and the PDF is built in your browser, on your device. Nothing is uploaded or stored, and the site’s security policy blocks the page from sending data to other servers.",
      },
      {
        q: "Will the quality be reduced?",
        a: "Not for JPG and PNG: they are placed in the PDF exactly as they are, without re-compressing. Photos taken sideways are turned upright without re-encoding. Other formats are converted once, to PNG if they have transparency or to high-quality JPEG otherwise.",
      },
      {
        q: "How do I convert JPG to PDF on iPhone?",
        a: "Open this page in Safari, tap Choose files and pick the photos from Photos or Files. Tap Convert, then Download: the PDF opens in the viewer, where you can share it or save it to Files.",
      },
    ],
  },
  related: ["merge-pdf", "pdf-to-jpg", "organize-pdf", "compress-image"],
  input: {
    kind: "files",
    accepts: {
      mime: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
        "image/avif",
        "image/heic",
        "image/heif",
      ],
      extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic", ".heif"],
      multiple: true,
    },
  },
  limits: {
    desktop: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 100 },
    mobile: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 50 },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  handoff: ["merge-pdf", "organize-pdf", "sign-pdf"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
