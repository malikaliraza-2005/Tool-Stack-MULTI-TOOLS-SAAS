// Runs one image of a batch through the shared pipeline (compress, resize,
// convert) and turns the worker's output into an ImageResult with the URLs
// the ComparisonSlider shows.

import { toolErrors } from "@/lib/errors";
import { getDeviceClass } from "@/lib/files/limits";
import { AVIF_SPEED, OUTPUT_FORMATS } from "@/lib/image/formats";
import { needsPreviews } from "@/lib/image/jobs";
import type { ProcessOptions, ProcessResult } from "@/lib/image/pipeline";
import type { ImageEntry, ImageResult, ProcessContext } from "./useImageBatch";

export type ProcessedImage = ImageResult & { details: Omit<ProcessResult, "bytes"> };

export async function processImageEntry<Extra>(
  entry: ImageEntry<Extra>,
  { pool, signal, bytes }: ProcessContext,
  options: ProcessOptions,
  name: (result: Omit<ProcessResult, "bytes">) => string,
): Promise<ProcessedImage> {
  const info = entry.info!;
  const previews = needsPreviews(info);
  const output = await pool.run(
    {
      op: "process",
      name: entry.file.name,
      bytes,
      info,
      options: { avifSpeed: AVIF_SPEED[getDeviceClass()], ...options },
      previews,
    },
    { transfer: [bytes], signal },
  );
  if (output.op !== "process") throw toolErrors.unknown(`processing ${entry.file.name}`);
  const { bytes: data, ...details } = output.result;
  const blob = new Blob([data], { type: OUTPUT_FORMATS[details.format].mime });
  const png = (buffer: ArrayBuffer) =>
    URL.createObjectURL(new Blob([buffer], { type: "image/png" }));
  return {
    blob,
    name: name(details),
    width: details.width,
    height: details.height,
    // Large images: downscaled previews; otherwise the original file and the result itself.
    beforeUrl: output.previews ? png(output.previews.before) : URL.createObjectURL(entry.file),
    afterUrl: output.previews ? png(output.previews.after) : URL.createObjectURL(blob),
    details,
  };
}
