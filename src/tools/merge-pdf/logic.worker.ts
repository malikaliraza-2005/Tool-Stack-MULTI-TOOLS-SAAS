// Merge PDF worker: pdf-lib runs here, so merging large files never blocks the
// page. Input and output buffers are transferred, not copied (architecture §8.4).

import { expose } from "@/lib/worker/expose";
import { inspectPdf, mergePdfs, type MergeJob, type MergeJobResult } from "./logic";

expose<MergeJob, MergeJobResult>(async (job, { progress }) => {
  if (job.op === "inspect") {
    const { pageCount } = await inspectPdf(job.file);
    return { result: { op: "inspect", pageCount } };
  }
  const { bytes, pageCount } = await mergePdfs(job.files, progress);
  // pdf-lib returns a view on a buffer of exactly the document's size.
  const buffer =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? (bytes.buffer as ArrayBuffer)
      : (bytes.slice().buffer as ArrayBuffer);
  return { result: { op: "merge", bytes: buffer, pageCount }, transfer: [buffer] };
}, "merging the PDFs");
