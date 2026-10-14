// Messages between the main thread and tool workers (architecture §8.1).

import type { SerializedToolError } from "@/lib/errors";

export type JobRequest<Req> = { id: number; request: Req };

export type JobMessage<Res> =
  | { id: number; type: "progress"; value: number; label?: string }
  | { id: number; type: "result"; result: Res }
  | { id: number; type: "error"; error: SerializedToolError };

/** Progress reported by a worker: `value` is 0–1. */
export type Progress = { value: number; label?: string };
