// runInWorker (architecture §8.1): typed request/response, transferables,
// progress, cancellation (AbortSignal → worker.terminate()), timeout, and
// errors mapped into the ToolError taxonomy.

import { deserializeToolError, toolErrors, ToolError } from "@/lib/errors";
import type { JobMessage, JobRequest, Progress } from "./protocol";

/** The parts of `Worker` the runner uses (a fake in unit tests). */
export type WorkerLike = {
  postMessage(message: unknown, transfer: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
};

export type RunOptions = {
  /** ArrayBuffers to transfer instead of copy (they are detached on this side). */
  transfer?: Transferable[];
  /** Aborting terminates the worker and rejects with E_CANCELLED. */
  signal?: AbortSignal;
  /** Terminates the worker and rejects with E_TIMEOUT after this many ms. */
  timeoutMs?: number;
  /** Message for E_TIMEOUT (tool-specific, tool-specifications §2.4). */
  timeoutMessage?: string;
  onProgress?: (progress: Progress) => void;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: ToolError) => void;
  onProgress?: (progress: Progress) => void;
  cleanup: () => void;
};

export type WorkerRunner<Req, Res> = {
  run(request: Req, options?: RunOptions): Promise<Res>;
  /** Terminates the worker; pending jobs reject with E_CANCELLED. */
  dispose(): void;
};

const DEFAULT_TIMEOUT_MESSAGE = "This took too long and was stopped. Try a smaller input.";

/**
 * A worker reused for a tool session (architecture §8.1). The worker is
 * created on the first job, so its code loads on intent. Cancelling or timing
 * out a job terminates the worker (the only way to stop running code) and
 * rejects every job in flight; the next job starts a fresh worker.
 */
export function createWorkerRunner<Req, Res>(factory: () => WorkerLike): WorkerRunner<Req, Res> {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  function settleAll(error: ToolError) {
    for (const job of pending.values()) {
      job.cleanup();
      job.reject(error);
    }
    pending.clear();
  }

  function kill(error: ToolError) {
    worker?.terminate();
    worker = null;
    settleAll(error);
  }

  function getWorker(): WorkerLike {
    if (worker) return worker;
    const created = factory();
    created.onmessage = (event: MessageEvent<JobMessage<Res>>) => {
      const message = event.data;
      const job = pending.get(message.id);
      if (!job) return;
      if (message.type === "progress") {
        job.onProgress?.({ value: message.value, label: message.label });
        return;
      }
      pending.delete(message.id);
      job.cleanup();
      if (message.type === "result") job.resolve(message.result);
      else job.reject(deserializeToolError(message.error));
    };
    // The worker script failed to load or threw outside a job.
    created.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      kill(toolErrors.unknown("starting the background worker", event.message || undefined));
    };
    created.onmessageerror = () => {
      kill(toolErrors.unknown("reading the result from the background worker"));
    };
    worker = created;
    return created;
  }

  function run(request: Req, options: RunOptions = {}): Promise<Res> {
    const { transfer = [], signal, timeoutMs, timeoutMessage, onProgress } = options;
    if (signal?.aborted) return Promise.reject(toolErrors.cancelled());

    return new Promise<Res>((resolve, reject) => {
      const id = nextId++;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => kill(toolErrors.cancelled());

      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onProgress,
        cleanup,
      });
      signal?.addEventListener("abort", onAbort, { once: true });
      if (timeoutMs !== undefined) {
        timer = setTimeout(
          () => kill(toolErrors.timeout(timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE)),
          timeoutMs,
        );
      }

      const message: JobRequest<Req> = { id, request };
      try {
        getWorker().postMessage(message, transfer);
      } catch (error) {
        pending.delete(id);
        cleanup();
        reject(toolErrors.unknown("starting the background worker", String(error), error));
      }
    });
  }

  return { run, dispose: () => kill(toolErrors.cancelled()) };
}

/** One job in a fresh worker that is terminated afterwards (e.g. regex, architecture §8.1). */
export async function runInWorker<Req, Res>(
  factory: () => WorkerLike,
  request: Req,
  options?: RunOptions,
): Promise<Res> {
  const runner = createWorkerRunner<Req, Res>(factory);
  try {
    return await runner.run(request, options);
  } finally {
    runner.dispose();
  }
}
