// Worker side of runInWorker: import in a `*.worker.ts` file and pass the handler.

import { serializeToolError, toToolError } from "@/lib/errors";
import type { JobMessage, JobRequest } from "./protocol";

export type JobContext = {
  /** Reports progress (0–1) to the main thread. */
  progress(value: number, label?: string): void;
};

/** What a handler returns: the result plus any buffers to transfer back. */
export type JobOutput<Res> = { result: Res; transfer?: Transferable[] };

type WorkerScope = {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

/**
 * Handles jobs from `createWorkerRunner`. Anything the handler throws is
 * mapped into a ToolError (`action` completes "Something unexpected happened
 * while {action}") and sent back as a plain object.
 */
export function expose<Req, Res>(
  handler: (request: Req, context: JobContext) => JobOutput<Res> | Promise<JobOutput<Res>>,
  action: string,
  scope: WorkerScope = self as unknown as WorkerScope,
): void {
  scope.onmessage = async (event: MessageEvent<JobRequest<Req>>) => {
    const { id, request } = event.data;
    const post = (message: JobMessage<Res>, transfer: Transferable[] = []) =>
      scope.postMessage(message, transfer);
    try {
      const output = await handler(request, {
        progress: (value, label) => post({ id, type: "progress", value, label }),
      });
      post({ id, type: "result", result: output.result }, output.transfer ?? []);
    } catch (error) {
      post({ id, type: "error", error: serializeToolError(toToolError(error, action)) });
    }
  };
}
