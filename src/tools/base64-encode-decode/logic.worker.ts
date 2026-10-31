// Base64 worker: files and text over 1 MB are encoded and decoded here so the
// page stays responsive (tool-specifications §5.3). Decoded bytes are
// transferred back, not copied.

import { expose } from "@/lib/worker/expose";
import { runJob, type Base64Job, type Base64JobResult } from "./logic";

expose<Base64Job, Base64JobResult>((job) => {
  const result = runJob(job);
  return { result, transfer: result.op === "decode" && result.ok ? [result.bytes] : [] };
}, "converting Base64");
