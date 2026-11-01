// Runs image jobs on a small pool of workers (architecture §8.3: batches with
// a concurrency of 2). Workers start on the first job; cancelling terminates
// all of them, and the next job starts fresh ones.

import type { RunOptions, WorkerLike, WorkerRunner } from "@/lib/worker/runner";
import { createWorkerRunner } from "@/lib/worker/runner";
import type { ImageJob, ImageJobResult } from "./jobs";

export type ImagePool = {
  run(job: ImageJob, options?: RunOptions): Promise<ImageJobResult>;
  dispose(): void;
};

const createImageWorker = (): WorkerLike =>
  new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" });

export function createImagePool(
  size: number,
  factory: () => WorkerLike = createImageWorker,
): ImagePool {
  const slots: { runner: WorkerRunner<ImageJob, ImageJobResult>; busy: number }[] = [];

  function pick() {
    // An idle slot, else a new one while under `size`, else the least busy.
    const idle = slots.find((slot) => slot.busy === 0);
    if (idle) return idle;
    if (slots.length < size) {
      const slot = { runner: createWorkerRunner<ImageJob, ImageJobResult>(factory), busy: 0 };
      slots.push(slot);
      return slot;
    }
    return slots.reduce((a, b) => (b.busy < a.busy ? b : a));
  }

  return {
    async run(job, options) {
      const slot = pick();
      slot.busy++;
      try {
        return await slot.runner.run(job, options);
      } finally {
        slot.busy--;
      }
    },
    dispose() {
      for (const slot of slots) slot.runner.dispose();
      slots.length = 0;
    },
  };
}

/**
 * Runs `task` for each item with at most `concurrency` running at once, in
 * order of start. Stops starting new items once `signal` aborts.
 */
export async function forEachLimited<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0;
  async function lane() {
    while (next < items.length && !signal?.aborted) {
      const index = next++;
      await task(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
}
