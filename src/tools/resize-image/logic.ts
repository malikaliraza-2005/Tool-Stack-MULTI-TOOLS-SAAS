// Resize Image (tool-specifications §4.3): sizes, presets, crop rectangles
// and pipeline settings. Pure and dependency-free, so the UI imports it
// directly; the work runs in the shared image worker.

import { outputFileName } from "@/lib/files/names";
import {
  OUTPUT_FORMATS,
  sameFormat,
  type ImageInfo,
  type ImageKind,
  type OutputFormat,
} from "@/lib/image/formats";
import type { ProcessOptions } from "@/lib/image/pipeline";
import type { Rect } from "@/lib/image/pixels";
import type { Size } from "@/lib/image/sizing";

export const ACCEPTED: readonly ImageKind[] = ["jpeg", "png", "webp", "avif"];
export const DEFAULT_QUALITY = 85;

export type Mode = "resize" | "crop";
export type ResizeBy = "pixels" | "percent";
/** With both sides set and proportions kept: fit inside the box, or fill it and crop the overflow. */
export type Fit = "inside" | "fill";
export type FormatChoice = "same" | OutputFormat;

export type ResizeSettings = {
  by: ResizeBy;
  /** Target width/height in px; null = not set. */
  width: number | null;
  height: number | null;
  keepProportions: boolean;
  fit: Fit;
  percent: number;
  dontEnlarge: boolean;
};

export type Preset = { id: string; label: string; width: number | null; height: number | null };

/** Common sizes, labelled generically (tool-specifications §4.3). */
export const PRESETS: readonly Preset[] = [
  { id: "3840w", label: "3840 wide (4K)", width: 3840, height: null },
  { id: "1920w", label: "1920 wide (Full HD)", width: 1920, height: null },
  { id: "1280w", label: "1280 wide (HD)", width: 1280, height: null },
  { id: "1080sq", label: "1080 × 1080 square post", width: 1080, height: 1080 },
  { id: "1080p", label: "1080 × 1350 portrait post", width: 1080, height: 1350 },
  { id: "1080s", label: "1080 × 1920 story", width: 1080, height: 1920 },
  { id: "1200og", label: "1200 × 630 link preview", width: 1200, height: 630 },
  { id: "1500b", label: "1500 × 500 header banner", width: 1500, height: 500 },
];

export type Aspect = "free" | "1:1" | "4:3" | "16:9" | "3:2" | "9:16";
export const ASPECTS: readonly Aspect[] = ["free", "1:1", "4:3", "16:9", "3:2", "9:16"];

/** Width ÷ height of a fixed aspect; null for free. */
export function aspectRatio(aspect: Aspect): number | null {
  if (aspect === "free") return null;
  const [w, h] = aspect.split(":").map(Number);
  return w! / h!;
}

const round = (n: number) => Math.max(1, Math.round(n));

/** The other side for a kept aspect ratio, rounded to the nearest pixel. */
export function proportional(source: Size, side: "width" | "height", value: number): Size {
  return side === "width"
    ? { width: round(value), height: round((value * source.height) / source.width) }
    : { width: round((value * source.width) / source.height), height: round(value) };
}

export type ResizePlan = {
  /** Size after scaling. */
  resize: Size;
  /** "Fill": centre crop in source pixels, applied before scaling. */
  crop?: Rect;
  /** The final output size. */
  output: Size;
  /** "Don't enlarge" kept the original size. */
  limited: boolean;
};

/**
 * Output size for one image. Proportions kept: width only, height only, or
 * both (fit inside or fill and crop). Not kept: exactly width × height, a
 * missing side stays as it is. "Don't enlarge" never scales up.
 */
export function planResize(source: Size, s: ResizeSettings): ResizePlan {
  const full: Rect = { x: 0, y: 0, width: source.width, height: source.height };
  let target: Size;
  let crop: Rect | undefined;

  if (s.by === "percent") {
    const scale = Math.max(0, s.percent) / 100;
    target = { width: round(source.width * scale), height: round(source.height * scale) };
  } else if (!s.width && !s.height) {
    target = source;
  } else if (!s.keepProportions) {
    target = { width: round(s.width ?? source.width), height: round(s.height ?? source.height) };
  } else if (s.width && !s.height) {
    target = proportional(source, "width", s.width);
  } else if (s.height && !s.width) {
    target = proportional(source, "height", s.height);
  } else {
    const box = { width: s.width!, height: s.height! };
    const scaleInside = Math.min(box.width / source.width, box.height / source.height);
    const scaleFill = Math.max(box.width / source.width, box.height / source.height);
    if (s.fit === "inside") {
      target = {
        width: round(source.width * scaleInside),
        height: round(source.height * scaleInside),
      };
    } else {
      // Crop the source to the box's aspect ratio (centred), then scale to the box.
      const cropWidth = Math.min(source.width, box.width / scaleFill);
      const cropHeight = Math.min(source.height, box.height / scaleFill);
      crop = {
        x: Math.round((source.width - cropWidth) / 2),
        y: Math.round((source.height - cropHeight) / 2),
        width: round(cropWidth),
        height: round(cropHeight),
      };
      target = { width: round(box.width), height: round(box.height) };
    }
  }

  const enlarges = target.width > source.width || target.height > source.height;
  if (s.dontEnlarge && enlarges) {
    // Keep the crop's shape (fill), at the largest size that doesn't scale up.
    const base = crop ?? full;
    return {
      resize: { width: base.width, height: base.height },
      crop,
      output: { width: base.width, height: base.height },
      limited: true,
    };
  }
  return { resize: target, crop, output: target, limited: false };
}

/** Pipeline settings for Resize mode. */
export function resizeSettings(
  info: ImageInfo,
  s: ResizeSettings,
  format: FormatChoice,
  quality: number,
): ProcessOptions {
  const plan = planResize(info, s);
  return { format: outputFormat(info.kind, format), quality, crop: plan.crop, resize: plan.resize };
}

/** A crop rectangle relative to the image: 0–1 on each axis. */
export type NormalizedRect = { x: number; y: number; width: number; height: number };

/** The largest centred rectangle with `aspect` (free: the whole image). */
export function defaultCrop(source: Size, aspect: Aspect): NormalizedRect {
  const ratio = aspectRatio(aspect);
  if (!ratio) return { x: 0, y: 0, width: 1, height: 1 };
  const imageRatio = source.width / source.height;
  const width = ratio < imageRatio ? ratio / imageRatio : 1;
  const height = ratio < imageRatio ? 1 : imageRatio / ratio;
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Keeps a crop inside the image, at least `minPx` pixels, with the aspect
 * (if fixed) enforced by adjusting the height around the top-left corner.
 */
export function constrainCrop(
  rect: NormalizedRect,
  source: Size,
  aspect: Aspect,
  minPx = 8,
): NormalizedRect {
  const minW = Math.min(1, minPx / source.width);
  const minH = Math.min(1, minPx / source.height);
  let width = clamp(rect.width, minW, 1);
  let height = clamp(rect.height, minH, 1);
  const ratio = aspectRatio(aspect);
  if (ratio) {
    // In normalized units the ratio depends on the image's own shape.
    const n = (ratio * source.height) / source.width;
    height = width / n;
    if (height > 1) {
      height = 1;
      width = n;
    }
    if (width > 1) {
      width = 1;
      height = 1 / n;
    }
  }
  return {
    x: clamp(rect.x, 0, 1 - width),
    y: clamp(rect.y, 0, 1 - height),
    width,
    height,
  };
}

/** The crop in whole source pixels. */
export function cropPixels(rect: NormalizedRect, source: Size): Rect {
  const x = Math.round(rect.x * source.width);
  const y = Math.round(rect.y * source.height);
  return {
    x,
    y,
    width: clamp(Math.round(rect.width * source.width), 1, source.width - x),
    height: clamp(Math.round(rect.height * source.height), 1, source.height - y),
  };
}

export function outputFormat(kind: ImageKind, choice: FormatChoice): OutputFormat {
  return choice === "same" ? (sameFormat(kind) ?? "jpeg") : choice;
}

/** "photo.jpg" → "photo-resized.jpg" / "photo-cropped.jpg". */
export function resizedName(original: string, mode: Mode, format: OutputFormat): string {
  return outputFileName(
    original,
    mode === "crop" ? "cropped" : "resized",
    OUTPUT_FORMATS[format].extension,
  );
}
