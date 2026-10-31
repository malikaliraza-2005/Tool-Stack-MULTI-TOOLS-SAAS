// Regex Tester worker: every pattern runs here, never on the page. The page
// kills this worker after 1000 ms, so catastrophic backtracking can't freeze
// it (tool-specifications §5.6).

import { expose } from "@/lib/worker/expose";
import { runRegex, type RegexJob, type RegexJobResult } from "./logic";

expose<RegexJob, RegexJobResult>((job) => ({ result: runRegex(job) }), "testing the pattern");
