import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "resize-image",
  category: "image",
  status: "live",
  name: "Resize Image",
  tagline:
    "Resize images to exact pixels or a percentage, or crop them to a shape, right in your browser. Nothing is uploaded.",
  icon: "scaling",
  keywords: [
    "image resizer",
    "crop image",
    "resize photo",
    "change image size",
    "resize image pixels",
    "crop photo",
    "resize image for instagram",
    "make image smaller",
  ],
  seo: {
    title: "Resize and Crop Images Online (No Upload) | Sprigkit",
    description:
      "Resize JPG, PNG, WebP and AVIF images to exact pixels, a percentage or common post sizes, or crop them to 1:1, 4:3 or 16:9. In your browser.",
    h1: "Resize and crop images",
    faqs: [
      {
        q: "How do I resize without losing quality?",
        a: "Making an image smaller keeps it sharp: the tool uses Lanczos resampling, which preserves fine detail. Enlarging can’t add detail that isn’t there, so Don’t enlarge is on by default. Keep PNG images as PNG, or use quality 85 or higher for JPG.",
      },
      {
        q: "How do I resize for Instagram without cropping?",
        a: "Choose a preset such as 1080 × 1350 portrait post and set Fit to Fit inside: the whole photo is kept and scaled to fit within that size. Fill and crop fills the exact size instead, trimming the edges evenly.",
      },
      {
        q: "Can I resize to exact pixels or a percentage?",
        a: "Both. Enter a width, a height or both in pixels; with Keep proportions on, a single side is enough and the other follows. Or switch to Percentage, for example 50% for half the size.",
      },
      {
        q: "How do I make a photo smaller in KB?",
        a: "Reducing the pixel size is the most effective way: a photo resized from 4000 to 1920 pixels wide is typically a quarter of the file size. For even smaller files, use Compress Image as well.",
      },
      {
        q: "Can I resize many images at once?",
        a: "Yes, up to 50 at a time. Each image keeps its own proportions; download them one by one or all as a ZIP file. In Crop mode you can adjust the crop of each image separately.",
      },
    ],
  },
  related: ["compress-image", "convert-image", "remove-exif-data", "jpg-to-pdf"],
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
  handoff: ["compress-image", "jpg-to-pdf"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
