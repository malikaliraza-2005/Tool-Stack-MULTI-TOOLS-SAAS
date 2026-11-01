// Compress Image (tool-specifications §4.1): options → pipeline settings,
// names and result lines. The work runs in the shared image worker. No
// heavy dependencies, so the UI imports it directly.

import { formatBytes } from "@/lib/files/format";
import { outputFileName } from "@/lib/files/names";
import {
  OUTPUT_FORMATS,
  sameFormat,
  type ImageInfo,
  type ImageKind,
  type OutputFormat,
} from "@/lib/image/formats";
import type { ProcessOptions } from "@/lib/image/pipeline";
import { fitWithin } from "@/lib/image/sizing";

export const ACCEPTED: readonly ImageKind[] = ["jpeg", "png", "webp", "avif"];

export type FormatChoice = "same" | OutputFormat;

export type CompressOptions = {
  format: FormatChoice;
  /** 0–100, for lossy formats. */
  quality: number;
  /** Longest side in pixels; 0 = keep the size. */
  maxDimension: number;
  stripMetadata: boolean;
};

export const DEFAULT_QUALITY = 75;

export function outputFormat(kind: ImageKind, choice: FormatChoice): OutputFormat {
  return choice === "same" ? (sameFormat(kind) ?? "jpeg") : choice;
}

/** Pipeline settings for one image. */
export function compressSettings(info: ImageInfo, options: CompressOptions): ProcessOptions {
  const resized = fitWithin(info, options.maxDimension);
  const changes = resized.width !== info.width || resized.height !== info.height;
  return {
    format: outputFormat(info.kind, options.format),
    quality: options.quality,
    resize: changes ? resized : undefined,
    keepOriginalIfLarger: true,
    keepMetadata: !options.stripMetadata,
  };
}

/** "photo.jpg" → "photo-compressed.webp". */
export function compressedName(original: string, format: OutputFormat): string {
  return outputFileName(original, "compressed", OUTPUT_FORMATS[format].extension);
}

/** "−67%" style; positive savings shown with a minus sign. */
export function percentSaved(before: number, after: number): number {
  return before > 0 ? Math.round((1 - after / before) * 100) : 0;
}

/** The per-file result line. */
export function compressNote(before: number, after: number, keptOriginal: boolean): string {
  if (keptOriginal) return "Already well optimized, original kept";
  const saved = percentSaved(before, after);
  const change = saved >= 0 ? `−${saved}%` : `+${-saved}%`;
  return `${formatBytes(before)} → ${formatBytes(after)} (${change})`;
}

/** Metadata can only be kept when a JPG stays a JPG (tool-specifications §4.1). */
export function canKeepMetadata(kind: ImageKind, options: CompressOptions): boolean {
  return kind === "jpeg" && outputFormat(kind, options.format) === "jpeg";
}
