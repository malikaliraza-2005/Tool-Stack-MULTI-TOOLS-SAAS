// Organize PDF worker: pdf-lib runs here, so saving large files never blocks
// the page. Buffers are transferred, not copied (architecture §8.4).

import { toTransferable } from "@/lib/pdf/load";
import { expose } from "@/lib/worker/expose";
import { inspectPdf, organizePdf, type OrganizeJob, type OrganizeJobResult } from "./logic";

expose<OrganizeJob, OrganizeJobResult>(async (job, { progress }) => {
  if (job.op === "inspect") {
    const { pageCount } = await inspectPdf(job.file);
    return { result: { op: "inspect", pageCount } };
  }
  const { bytes, pageCount } = await organizePdf(job.file, job.plan, progress);
  const buffer = toTransferable(bytes);
  return { result: { op: "organize", bytes: buffer, pageCount }, transfer: [buffer] };
}, "organizing the PDF");
