// Output sizes and names for PDF to JPG (tool-specifications §3.5). Pure: no
// DOM, no pdf.js, so it is fully unit-tested.

import { baseName, sanitizeFileName } from "@/lib/files/names";

export type ImageFormat = "jpg" | "png";
export type Dpi = 72 | 150 | 300;

/**
 * Largest canvas, in pixels, per device class. iOS Safari refuses canvases
 * over 16,777,216 px (4096 × 4096); desktop browsers allow far more, but
 * very large canvases exhaust memory, so they are capped too.
 */
export const MAX_PIXELS = { mobile: 16_777_216, desktop: 100_000_000 } as const;

export type RenderSize = {
  /** pdf.js scale: device pixels per PDF point. */
  scale: number;
  width: number;
  height: number;
  /** The DPI actually used; lower than asked when the page was too large. */
  dpi: number;
  downscaled: boolean;
};

/**
 * Pixel size of a page `width` × `height` points at `dpi`, reduced to fit
 * `maxPixels` when needed (keeping the aspect ratio).
 */
export function renderSize(
  width: number,
  height: number,
  dpi: number,
  maxPixels: number,
): RenderSize {
  let scale = dpi / 72;
  const area = width * scale * (height * scale);
  const downscaled = area > maxPixels;
  if (downscaled) scale *= Math.sqrt(maxPixels / area);
  return {
    scale,
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    dpi: Math.round(scale * 72),
    downscaled,
  };
}

/** `report-page-3.jpg`; pages are 1-based. */
export function imageName(pdfName: string, page: number, format: ImageFormat): string {
  const base = sanitizeFileName(baseName(pdfName)) || "document";
  return `${base}-page-${page}.${format}`;
}

/** `report-images.zip` for several images. */
export function zipName(pdfName: string): string {
  return `${sanitizeFileName(baseName(pdfName)) || "document"}-images.zip`;
}
