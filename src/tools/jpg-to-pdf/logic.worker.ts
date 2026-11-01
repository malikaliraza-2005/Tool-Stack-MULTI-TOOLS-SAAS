// JPG to PDF worker: decoding images and building the PDF run here, so large
// photos never block the page. Buffers are transferred (architecture §8.4).

import { toolErrors } from "@/lib/errors";
import { toTransferable } from "@/lib/pdf/load";
import { expose } from "@/lib/worker/expose";
import type { FileKind } from "@/lib/files/sniff";
import {
  heicUnsupported,
  imageKind,
  imagesToPdf,
  type Decoder,
  type JpgToPdfJob,
  type JpgToPdfJobResult,
} from "./logic";

const MIME: Record<FileKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  avif: "image/avif",
  heic: "image/heic",
  pdf: "application/pdf",
};

/** Decodes with the browser (EXIF orientation applied) and re-encodes: PNG if transparent, else JPEG 0.92. */
const decode: Decoder = async (bytes, kind) => {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: MIME[kind] }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas in this worker");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let transparent = false;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i]! < 255) {
      transparent = true;
      break;
    }
  }
  const blob = await canvas.convertToBlob(
    transparent ? { type: "image/png" } : { type: "image/jpeg", quality: 0.92 },
  );
  return { format: transparent ? "png" : "jpeg", bytes: await blob.arrayBuffer() };
};

expose<JpgToPdfJob, JpgToPdfJobResult>(async (job, { progress }) => {
  if (job.op === "inspect") {
    const kind = imageKind(job.file);
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(new Blob([job.file.bytes], { type: MIME[kind] }));
    } catch (error) {
      if (kind === "heic") throw heicUnsupported(job.file.name);
      throw toolErrors.corrupt(job.file.name, error);
    }
    const { width, height } = bitmap;
    bitmap.close();
    return { result: { op: "inspect", width, height, kind } };
  }
  const { bytes, pageCount } = await imagesToPdf(job.files, job.options, decode, progress);
  const buffer = toTransferable(bytes);
  return { result: { op: "convert", bytes: buffer, pageCount }, transfer: [buffer] };
}, "converting the images");
