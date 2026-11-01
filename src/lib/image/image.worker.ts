// The image worker (P6-T01), shared by the image tools: decoding, resizing,
// encoding and metadata work run here, so large photos never block the page.
// Buffers are transferred both ways (architecture §8.4).

import { toolErrors } from "@/lib/errors";
import { expose } from "@/lib/worker/expose";
import { codecs } from "./codecs";
import { sameFormat, type ImageInfo } from "./formats";
import { PREVIEW_EDGE, type ImageJob, type ImageJobResult, type Previews } from "./jobs";
import { findMetadata, stripMetadata, type MetadataContainer } from "./metadata";
import { processImage } from "./pipeline";
import type { Pixels } from "./pixels";
import { readMetadataTags } from "./read-metadata";
import { buildReport } from "./report";

function container(info: ImageInfo, name: string): MetadataContainer {
  if (info.kind === "jpeg" || info.kind === "png" || info.kind === "webp") return info.kind;
  throw toolErrors.unsupportedFormat({
    name,
    tool: "Remove EXIF Data",
    formats: "JPG, PNG and WebP images",
  });
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

/** A downscaled PNG of `pixels` for on-screen comparison. */
async function preview(pixels: Pixels): Promise<ArrayBuffer> {
  const scale = Math.min(1, PREVIEW_EDGE / Math.max(pixels.width, pixels.height));
  const width = Math.max(1, Math.round(pixels.width * scale));
  const height = Math.max(1, Math.round(pixels.height * scale));
  const small = scale < 1 ? await codecs.resize(pixels, width, height) : pixels;
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context) {
      context.putImageData(new ImageData(new Uint8ClampedArray(small.data), width, height), 0, 0);
      return (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer();
    }
  }
  return codecs.encode(small, "png", 100);
}

expose<ImageJob, ImageJobResult>(async (job, { progress }) => {
  const input = new Uint8Array(job.bytes);

  if (job.op === "inspect-metadata") {
    const kind = container(job.info, job.name);
    let blocks;
    try {
      blocks = findMetadata(input, kind);
    } catch (error) {
      throw toolErrors.corrupt(job.name, error);
    }
    const tags = await readMetadataTags(input, kind, blocks);
    return {
      result: { op: "inspect-metadata", report: buildReport(tags, blocks, job.info.orientation) },
    };
  }

  if (job.op === "remove-metadata") {
    const kind = container(job.info, job.name);
    // Removing the orientation too: turn the pixels upright so the photo still shows correctly.
    if (job.mode === "everything" && job.info.orientation !== 1) {
      const format = sameFormat(job.info.kind)!;
      const { bytes } = await processImage(
        { name: job.name, bytes: job.bytes },
        job.info,
        { format, quality: 95 },
        codecs,
      );
      return { result: { op: "remove-metadata", bytes, reencoded: true }, transfer: [bytes] };
    }
    let bytes: ArrayBuffer;
    try {
      bytes = toBuffer(
        stripMetadata(input, kind, { keepOrientation: job.mode === "keep-orientation" }),
      );
    } catch (error) {
      throw toolErrors.corrupt(job.name, error);
    }
    return { result: { op: "remove-metadata", bytes, reencoded: false }, transfer: [bytes] };
  }

  let source: Pixels | undefined;
  const result = await processImage(
    { name: job.name, bytes: job.bytes },
    job.info,
    job.options,
    codecs,
    {
      onStep: (label) => progress(0, label),
      onSource: (pixels) => {
        if (job.previews) source = pixels;
      },
    },
  );
  let previews: Previews | undefined;
  if (job.previews && source) {
    progress(0, `Preparing a preview of ${job.name}`);
    const before = await preview(source);
    source = undefined;
    const decoded = await codecs.decode(result.bytes, result.format);
    const after = await preview(decoded.pixels);
    previews = { before, after };
  }
  const transfer = [result.bytes, ...(previews ? [previews.before, previews.after] : [])];
  return { result: { op: "process", result, previews }, transfer };
}, "processing the image");
