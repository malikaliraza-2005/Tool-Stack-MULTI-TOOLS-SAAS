// Split PDF worker: pdf-lib runs here, so splitting large files never blocks
// the page. Buffers are transferred, not copied (architecture §8.4).

import { toTransferable } from "@/lib/pdf/load";
import { expose } from "@/lib/worker/expose";
import { inspectPdf, splitPdf, type SplitJob, type SplitJobResult } from "./logic";

expose<SplitJob, SplitJobResult>(async (job, { progress }) => {
  if (job.op === "inspect") {
    const { pageCount } = await inspectPdf(job.file);
    return { result: { op: "inspect", pageCount } };
  }
  const outputs = await splitPdf(job.file, job.options, progress);
  const files = outputs.map((output) => ({
    name: output.name,
    bytes: toTransferable(output.bytes),
    pageCount: output.pageCount,
  }));
  return { result: { op: "split", files }, transfer: files.map((file) => file.bytes) };
}, "splitting the PDF");
