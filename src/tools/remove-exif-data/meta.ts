import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "remove-exif-data",
  category: "image",
  status: "live",
  name: "Remove EXIF Data",
  shortName: "Remove EXIF",
  tagline:
    "See and remove the hidden location, camera and date details in your photos, right in your browser. Nothing is uploaded.",
  icon: "eraser",
  keywords: [
    "remove metadata from photo",
    "remove location from photo",
    "remove gps from photo",
    "exif remover",
    "strip exif",
    "remove metadata",
    "exif viewer",
    "photo metadata",
  ],
  seo: {
    title: "Remove EXIF Data and GPS Location from Photos | Sprigkit",
    description:
      "See what your photos reveal (GPS location, camera, dates) and remove it without changing a pixel. JPG, PNG and WebP, in your browser.",
    h1: "Remove EXIF data and location from photos",
    faqs: [
      {
        q: "What is EXIF data?",
        a: "Details your camera or phone saves inside the photo file: often the GPS location where it was taken, the date and time, the camera or phone model (sometimes its serial number) and the editing software. Anyone who gets the original file can read them.",
      },
      {
        q: "How do I check what EXIF data a photo has?",
        a: "Drop the photo on this page. Before anything is removed, you see what it contains, grouped as location, camera and device, date and time, software and other details. The location is shown as text coordinates; no map is loaded.",
      },
      {
        q: "Does removing EXIF reduce quality?",
        a: "No. Only the metadata is removed; the image data is copied byte for byte, so the photo is exactly as sharp as before. The one exception is the optional Remove everything mode on a photo that was taken sideways: it is re-saved once at high quality so it stays upright without its orientation tag.",
      },
      {
        q: "How do I remove the location from a photo on iPhone or Android?",
        a: "Open this page in your phone’s browser, tap Choose files and pick the photos. Tap Remove metadata, then download the cleaned copies. iPhone: if Photos offers HEIC, choose Most Compatible in Settings › Camera › Formats, since this tool reads JPG, PNG and WebP.",
      },
      {
        q: "Are my photos uploaded?",
        a: "No. The photos are read and cleaned in your browser, on your device. Nothing is uploaded or stored, and the site’s security policy blocks the page from sending data to other servers.",
      },
    ],
  },
  related: ["compress-image", "resize-image", "convert-image", "jpg-to-pdf"],
  input: {
    kind: "files",
    accepts: {
      mime: ["image/jpeg", "image/png", "image/webp"],
      extensions: [".jpg", ".jpeg", ".png", ".webp"],
      multiple: true,
    },
  },
  limits: {
    desktop: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 50 },
    mobile: { softBytes: 25 * MB, hardBytes: 100 * MB, maxFiles: 50 },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  handoff: ["compress-image", "resize-image"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
