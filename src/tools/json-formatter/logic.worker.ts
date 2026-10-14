// JSON Formatter worker: inputs over 1 MB are parsed and formatted here so the
// page stays responsive (tool-specifications §5.1).

import { expose } from "@/lib/worker/expose";
import { runJob, type JsonJob, type JsonJobResult } from "./logic";

expose<JsonJob, JsonJobResult>((job) => ({ result: runJob(job) }), "formatting the JSON");
