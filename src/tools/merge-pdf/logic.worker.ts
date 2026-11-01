// Merge PDF worker: pdf-lib runs here, so merging large files never blocks the
// page. Input and output buffers are transferred, not copied (architecture §8.4).

import { toTransferable } from "@/lib/pdf/load";
import { expose } from "@/lib/worker/expose";
import { inspectPdf, mergePdfs, type MergeJob, type MergeJobResult } from "./logic";

expose<MergeJob, MergeJobResult>(async (job, { progress }) => {
  if (job.op === "inspect") {
    const { pageCount } = await inspectPdf(job.file);
    return { result: { op: "inspect", pageCount } };
  }
  const { bytes, pageCount } = await mergePdfs(job.files, progress);
  const buffer = toTransferable(bytes);
  return { result: { op: "merge", bytes: buffer, pageCount }, transfer: [buffer] };
}, "merging the PDFs");
