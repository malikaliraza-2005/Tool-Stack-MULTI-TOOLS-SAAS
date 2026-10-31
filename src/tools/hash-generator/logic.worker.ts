// Hash Generator worker: files are hashed here chunk by chunk, with progress,
// so the page stays responsive and memory stays flat (tool-specifications §5.9).

import { expose } from "@/lib/worker/expose";
import { hashBlob, type HashFileJob, type HashFileResult } from "./logic";

expose<HashFileJob, HashFileResult>(async (job, context) => {
  const result = await hashBlob(job.file, job.algorithms, job.hmacKey, (done) =>
    context.progress(done),
  );
  return { result, transfer: Object.values(result).map((bytes) => bytes.buffer) };
}, "hashing the file");
