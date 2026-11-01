// Jobs for the image worker (P6-T01). Types only on the main thread: the
// codecs, exifr and the pipeline stay in the worker chunk.

import type { ImageInfo } from "./formats";
import type { ProcessOptions, ProcessResult } from "./pipeline";
import type { MetadataReport } from "./report";

/** Downscaled before/after previews for the ComparisonSlider above this many pixels. */
export const PREVIEW_ABOVE_PIXELS = 16_000_000;
/** Longest side of a downscaled preview. */
export const PREVIEW_EDGE = 2048;

export type Previews = { before: ArrayBuffer; after: ArrayBuffer };

export type ImageJob =
  | {
      op: "process";
      name: string;
      bytes: ArrayBuffer;
      info: ImageInfo;
      options: ProcessOptions;
      /** Return downscaled previews (large images, or formats the browser can't show). */
      previews: boolean;
    }
  | { op: "inspect-metadata"; name: string; bytes: ArrayBuffer; info: ImageInfo }
  | {
      op: "remove-metadata";
      name: string;
      bytes: ArrayBuffer;
      info: ImageInfo;
      /** "everything" also removes the orientation, turning the pixels upright instead. */
      mode: "keep-orientation" | "everything";
    };

export type ImageJobResult =
  | { op: "process"; result: ProcessResult; previews?: Previews }
  | { op: "inspect-metadata"; report: MetadataReport }
  | { op: "remove-metadata"; bytes: ArrayBuffer; reencoded: boolean };

/** Previews are needed when the image is large or the browser can't show the original. */
export function needsPreviews(info: ImageInfo): boolean {
  return info.width * info.height > PREVIEW_ABOVE_PIXELS || info.kind === "heic";
}
