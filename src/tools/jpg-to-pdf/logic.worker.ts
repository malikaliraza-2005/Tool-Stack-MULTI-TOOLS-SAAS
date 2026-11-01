// JPG to PDF worker: decoding images and building the PDF run here, so large
// photos never block the page. Buffers are transferred (architecture §8.4).
// Images the PDF can't embed directly go through the shared image codecs
// (P6-T11): WASM fallbacks where the browser can't decode, HEIC via libheif.

import { toolErrors } from "@/lib/errors";
import { codecs } from "@/lib/image/codecs";
import { readImageInfo, type ImageKind } from "@/lib/image/formats";
import { hasTransparency, orient } from "@/lib/image/pixels";
import { toTransferable } from "@/lib/pdf/load";
import { expose } from "@/lib/worker/expose";
import {
  imageKind,
  imagesToPdf,
  type Decoder,
  type JpgToPdfJob,
  type JpgToPdfJobResult,
} from "./logic";

/** Decodes (upright) and re-encodes: PNG if transparent, else JPEG at quality 92. */
const decode: Decoder = async (bytes, kind) => {
  const { pixels, oriented } = await codecs.decode(bytes, kind as ImageKind);
  const orientation = oriented ? 1 : (readImageInfo(new Uint8Array(bytes))?.orientation ?? 1);
  const upright = orient(pixels, orientation);
  const format = hasTransparency(upright) ? "png" : "jpeg";
  return { format, bytes: await codecs.encode(upright, format, 92) };
};

expose<JpgToPdfJob, JpgToPdfJobResult>(async (job, { progress }) => {
  if (job.op === "inspect") {
    // The header is enough to check the file and show its upright size.
    const kind = imageKind(job.file);
    const info = readImageInfo(new Uint8Array(job.file.bytes));
    if (!info) throw toolErrors.corrupt(job.file.name);
    return { result: { op: "inspect", width: info.width, height: info.height, kind } };
  }
  const { bytes, pageCount } = await imagesToPdf(job.files, job.options, decode, progress);
  const buffer = toTransferable(bytes);
  return { result: { op: "convert", bytes: buffer, pageCount }, transfer: [buffer] };
}, "converting the images");
