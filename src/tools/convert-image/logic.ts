// Convert Image (tool-specifications §4.2): options → pipeline settings,
// names and notes. The work runs in the shared image worker (HEIC through
// libheif, D-6). Dependency-free, so the UI imports it directly.

import { baseName, sanitizeFileName } from "@/lib/files/names";
import {
  KIND_LABELS,
  OUTPUT_FORMATS,
  type ImageInfo,
  type ImageKind,
  type OutputFormat,
} from "@/lib/image/formats";
import type { ProcessOptions } from "@/lib/image/pipeline";
import { parseHexColor, type Rgb } from "@/lib/image/pixels";

export const ACCEPTED: readonly ImageKind[] = ["jpeg", "png", "webp", "avif", "gif", "bmp", "heic"];
export const DEFAULT_QUALITY = 85;
export const DEFAULT_BACKGROUND = "#ffffff";

/** Auto: JPG, or PNG for images with transparency (tool-specifications §4.2). */
export type FormatChoice = "auto" | OutputFormat;

export type ConvertOptions = { format: FormatChoice; quality: number; background: string };

/** Pipeline settings for one image. */
export function convertSettings(options: ConvertOptions): ProcessOptions {
  const background: Rgb = parseHexColor(options.background) ?? [255, 255, 255];
  return options.format === "auto"
    ? { format: "jpeg", alphaFormat: "png", quality: options.quality, background }
    : { format: options.format, quality: options.quality, background };
}

/**
 * "IMG_1234.HEIC" → "IMG_1234.jpg": the same name in the new format. When
 * the format doesn't change, "-converted" is added so the original isn't
 * overwritten in the downloads folder.
 */
export function convertedName(original: string, kind: ImageKind, format: OutputFormat): string {
  const base = sanitizeFileName(baseName(original)) || "image";
  const ext = OUTPUT_FORMATS[format].extension;
  return kind === format ? `${base}-converted.${ext}` : `${base}.${ext}`;
}

/** The per-file result line: "HEIC → JPG", plus "transparency filled" when flattened. */
export function convertNote(kind: ImageKind, format: OutputFormat, flattened: boolean): string {
  const note = `${KIND_LABELS[kind]} → ${OUTPUT_FORMATS[format].label}`;
  return flattened ? `${note} · transparent areas filled` : note;
}

export function animationWarning(info: ImageInfo): string | undefined {
  return info.animated
    ? "Animated image: only the first frame is converted (first frame only)."
    : undefined;
}

/** Whether the background colour can matter: some output is JPG and some input may be transparent. */
export function backgroundApplies(infos: readonly ImageInfo[], format: FormatChoice): boolean {
  return format === "jpeg" && infos.some((info) => info.alpha);
}
