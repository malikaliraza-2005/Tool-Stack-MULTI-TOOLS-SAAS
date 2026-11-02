// Category hub content (G-8, information-architecture §1). The tool lists come
// from the registry; this holds the hub's own words. hubs.test.ts checks the
// SEO lengths and that every guide points at a published tool of the hub.

import type { ToolCategory } from "./types";

export type HubContent = {
  seo: { title: string; description: string };
  h1: string;
  intro: string;
  /** Short guide links to a tool's "How to use" section. */
  guides: { label: string; slug: string }[];
};

export const HUBS: Record<ToolCategory, HubContent> = {
  pdf: {
    seo: {
      title: "Free PDF Tools Online: Private, No Upload | Sprigkit",
      description:
        "Merge, split, organize, sign and convert PDF files in your browser. Files stay on your device and are never uploaded. Free, no sign-up.",
    },
    h1: "PDF tools",
    intro:
      "Merge, split, reorder, sign and convert PDFs. Every tool runs in your browser, so contracts, scans and statements never leave your device.",
    guides: [
      { label: "How to merge PDF files", slug: "merge-pdf" },
      { label: "How to extract pages from a PDF", slug: "split-pdf" },
      { label: "How to turn photos into a PDF", slug: "jpg-to-pdf" },
      { label: "How to fill in and sign a PDF", slug: "sign-pdf" },
    ],
  },
  image: {
    seo: {
      title: "Free Image Tools Online: Private, No Upload | Sprigkit",
      description:
        "Compress, convert, resize and clean images in your browser, including HEIC photos from iPhones. Images stay on your device and are never uploaded.",
    },
    h1: "Image tools",
    intro:
      "Compress, convert and resize photos, and remove hidden metadata such as location. HEIC photos from iPhones work too. Images are processed on your device and never uploaded.",
    guides: [
      { label: "How to make an image file smaller", slug: "compress-image" },
      { label: "How to convert HEIC to JPG", slug: "convert-image" },
      { label: "How to resize a photo for an upload form", slug: "resize-image" },
      { label: "How to remove location data from a photo", slug: "remove-exif-data" },
    ],
  },
  developer: {
    seo: {
      title: "Free Developer Tools Online: Private, Local | Sprigkit",
      description:
        "Format JSON, decode JWTs, encode Base64 and URLs, compare text and test regex in your browser. Your input is never sent anywhere.",
    },
    h1: "Developer tools",
    intro:
      "Format JSON, decode tokens, encode and decode text, compare files and test regular expressions. Your input stays in your browser, which matters for tokens, keys and customer data.",
    guides: [
      { label: "How to format and validate JSON", slug: "json-formatter" },
      { label: "How to decode a JWT", slug: "jwt-decoder" },
      { label: "How to test a regular expression", slug: "regex-tester" },
      { label: "How to convert a Unix timestamp to a date", slug: "unix-timestamp-converter" },
    ],
  },
};
