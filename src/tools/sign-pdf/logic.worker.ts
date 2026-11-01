// Sign PDF worker: pdf-lib runs here, so filling and saving large files never
// blocks the page. Buffers are transferred, not copied (architecture §8.4).

import { toTransferable } from "@/lib/pdf/load";
import { expose } from "@/lib/worker/expose";
import { inspectPdf, signPdf, type SignJob, type SignJobResult } from "./logic";

expose<SignJob, SignJobResult>(async (job, { progress }) => {
  if (job.op === "inspect") return { result: { op: "inspect", info: await inspectPdf(job.file) } };
  const { bytes, pageCount } = await signPdf(job.file, job, progress);
  const buffer = toTransferable(bytes);
  return { result: { op: "sign", bytes: buffer, pageCount }, transfer: [buffer] };
}, "signing the PDF");
