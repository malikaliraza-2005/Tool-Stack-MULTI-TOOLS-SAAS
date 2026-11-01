import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "compress-image",
  category: "image",
  status: "live",
  name: "Compress Image",
  tagline:
    "Make JPG, PNG, WebP and AVIF images smaller and compare the result side by side, right in your browser. Nothing is uploaded.",
  icon: "image-down",
  keywords: [
    "reduce image size",
    "image compressor",
    "compress jpg",
    "compress png",
    "compress photo",
    "make image smaller",
    "compress image to 100kb",
    "optimize images",
  ],
  seo: {
    title: "Compress Image: Reduce JPG, PNG, WebP Size (No Upload) | Sprigkit",
    description:
      "Reduce image file size with adjustable quality and a before/after slider. JPG, PNG, WebP and AVIF, many at once, in your browser.",
    h1: "Compress images",
    faqs: [
      {
        q: "How do I compress an image to 100 KB (or another target size)?",
        a: "Lower the Quality slider and compress again until the size shown next to the image is under your target; 60–75 usually works for photos. For a big drop, also set Longest side to 1920 or 1280 px, or choose WebP, which is often 25–35% smaller than JPG at the same quality.",
      },
      {
        q: "Does compression reduce quality?",
        a: "JPG, WebP and AVIF compression removes detail you mostly can’t see; at quality 75 the difference is hard to spot. Drag the divider over the image to compare. PNG compression is lossless: the pixels stay exactly the same, only the file is stored more efficiently.",
      },
      {
        q: "Can I compress without losing quality?",
        a: "Yes: keep PNG images as PNG (lossless), or use quality 90 or higher for photos, which is visually identical in almost all cases. If a compressed file would be larger than the original, the original is kept.",
      },
      {
        q: "Is it safe to compress images online?",
        a: "Here, yes: the images are compressed in your browser, on your device. Nothing is uploaded or stored, and the site’s security policy blocks the page from sending data to other servers.",
      },
      {
        q: "Can I compress many images at once?",
        a: "Yes, up to 50 at a time. Each image shows its own saving, the total is shown at the end, and you can download them one by one or all as a ZIP file.",
      },
    ],
  },
  related: ["resize-image", "convert-image", "remove-exif-data", "jpg-to-pdf"],
  input: {
    kind: "files",
    accepts: {
      mime: ["image/jpeg", "image/png", "image/webp", "image/avif"],
      extensions: [".jpg", ".jpeg", ".png", ".webp", ".avif"],
      multiple: true,
    },
  },
  limits: {
    desktop: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 50 },
    mobile: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 50 },
  },
  processing: { local: true, worker: true, offline: true },
  handoff: ["resize-image", "jpg-to-pdf"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
