import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "convert-image",
  category: "image",
  status: "live",
  name: "Convert Image",
  tagline:
    "Convert HEIC, WebP, PNG, JPG, AVIF, GIF and BMP images to JPG, PNG, WebP or AVIF, right in your browser. Nothing is uploaded.",
  icon: "repeat",
  keywords: [
    "heic to jpg",
    "webp to png",
    "webp to jpg",
    "png to jpg",
    "image converter",
    "jpg to png",
    "heic converter",
    "avif to jpg",
  ],
  seo: {
    title: "Convert Image: HEIC, WebP, PNG to JPG (No Upload) | Sprigkit",
    description:
      "Convert HEIC iPhone photos, WebP, PNG, AVIF, GIF and BMP to JPG, PNG, WebP or AVIF, many at once. Private: it all runs in your browser.",
    h1: "Convert images: HEIC, WebP, PNG and more",
    faqs: [
      {
        q: "How do I convert HEIC to JPG?",
        a: "Drop the HEIC photos on this page; Auto converts them to JPG. Select Convert, then download them one by one or as a ZIP file. It works in every current browser, not only Safari, and photos keep their upright orientation.",
      },
      {
        q: "Is it safe to convert iPhone photos online?",
        a: "Here, yes: the photos are converted in your browser, on your device. Nothing is uploaded or stored, and the site’s security policy blocks the page from sending data to other servers. The converted files also don’t carry the photos’ location or camera details.",
      },
      {
        q: "What happens to transparency when converting PNG to JPG?",
        a: "JPG can’t store transparency, so transparent areas are filled with a background colour: white by default, or black or any colour you choose. Auto keeps transparent images as PNG instead.",
      },
      {
        q: "Which format is smallest: WebP, AVIF or JPG?",
        a: "Usually AVIF, then WebP, then JPG at similar quality: WebP is often 25–35% smaller than JPG and AVIF smaller still, but AVIF takes longer to create. JPG opens everywhere, so it is the safest choice for sharing.",
      },
      {
        q: "Can I convert many images at once?",
        a: "Yes, up to 50 at a time, in mixed formats. Download each converted image, or all of them as one ZIP file.",
      },
    ],
  },
  related: ["compress-image", "resize-image", "jpg-to-pdf", "remove-exif-data"],
  input: {
    kind: "files",
    accepts: {
      mime: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
        "image/bmp",
        "image/heic",
        "image/heif",
      ],
      extensions: [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".bmp", ".heic", ".heif"],
      multiple: true,
    },
  },
  limits: {
    desktop: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 50 },
    mobile: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 50 },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  handoff: ["compress-image", "jpg-to-pdf"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
