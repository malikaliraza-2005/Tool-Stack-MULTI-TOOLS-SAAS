// Diff Checker worker: comparing large texts can take a while, so it always
// runs here and the page stays responsive (tool-specifications §5.5).

import { expose } from "@/lib/worker/expose";
import { compare, type DiffJob, type DiffJobResult } from "./logic";

expose<DiffJob, DiffJobResult>((job) => ({ result: compare(job) }), "comparing the texts");
