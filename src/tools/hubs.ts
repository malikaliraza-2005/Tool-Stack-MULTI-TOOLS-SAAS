// Category hub content (G-8, information-architecture §1). The tool lists come
// from the registry; this holds the hub's own words. hubs.test.ts checks the
// SEO lengths and that every guide points at a published tool of the hub.

import type { ToolCategory } from "./types";

export type HubContent = {
  seo: { title: string; description: string };
  h1: string;
  intro: string;
  /** "Which tool do I need?": when to pick each tool of the hub (page-seo-specs §4.2). */
  choosing: { slug: string; when: string }[];
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
    choosing: [
      { slug: "merge-pdf", when: "You have several PDFs and want them as one file." },
      {
        slug: "split-pdf",
        when: "You want some pages as a new PDF, or the document cut into single pages or every few pages.",
      },
      {
        slug: "organize-pdf",
        when: "You want to keep one file but reorder, rotate or delete its pages.",
      },
      {
        slug: "jpg-to-pdf",
        when: "You have photos or scans and need them as a PDF, one image per page.",
      },
      {
        slug: "pdf-to-jpg",
        when: "You need pages as images, for a slide or an upload form that only takes pictures.",
      },
      {
        slug: "sign-pdf",
        when: "You need to fill in a form, or add your signature, initials or a date.",
      },
    ],
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
    choosing: [
      {
        slug: "compress-image",
        when: "The file is too large in KB or MB, but its width and height are fine.",
      },
      {
        slug: "resize-image",
        when: "The image is larger in pixels than it needs to be, or must be cropped to a shape such as square. Fewer pixels also means a smaller file.",
      },
      {
        slug: "convert-image",
        when: "A site or app doesn’t accept the format, such as HEIC photos from an iPhone or WebP images saved from the web.",
      },
      {
        slug: "remove-exif-data",
        when: "You want to share a photo without the location, camera and date stored inside it.",
      },
    ],
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
    choosing: [
      { slug: "json-formatter", when: "JSON is minified, invalid, or too large to read." },
      {
        slug: "jwt-decoder",
        when: "You have a token of three dot-separated parts and want to read its claims or check its signature.",
      },
      {
        slug: "base64-encode-decode",
        when: "Data has to travel as plain text, as in data URLs, email or JSON. Base64 hides nothing: it is an encoding, not encryption.",
      },
      {
        slug: "url-encode-decode",
        when: "Text goes inside a URL, such as a query parameter, or a link full of %20 and %3A needs reading.",
      },
      {
        slug: "diff-checker",
        when: "You have two versions of a text or file and want to see what changed.",
      },
      {
        slug: "regex-tester",
        when: "You are writing or debugging a JavaScript regular expression.",
      },
      {
        slug: "unix-timestamp-converter",
        when: "A log or API shows a number such as 1767225600 and you need the date, or the other way round.",
      },
      {
        slug: "uuid-generator",
        when: "You need unique IDs, or want to know what version a UUID is.",
      },
      {
        slug: "hash-generator",
        when: "You want to check a download against its published checksum, or fingerprint some data.",
      },
    ],
    guides: [
      { label: "How to format and validate JSON", slug: "json-formatter" },
      { label: "How to decode a JWT", slug: "jwt-decoder" },
      { label: "How to test a regular expression", slug: "regex-tester" },
      { label: "How to convert a Unix timestamp to a date", slug: "unix-timestamp-converter" },
    ],
  },
};
