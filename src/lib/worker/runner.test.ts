import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolError, toolErrors } from "@/lib/errors";
import { expose, type JobContext, type JobOutput } from "./expose";
import { createWorkerRunner, runInWorker, type WorkerLike } from "./runner";

type Handler = (
  request: unknown,
  ctx: JobContext,
) => JobOutput<unknown> | Promise<JobOutput<unknown>>;

/**
 * An in-memory worker: `expose()` runs on a fake worker scope, and messages
 * are delivered asynchronously like the real thing.
 */
class FakeWorker implements WorkerLike {
  static created: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminated = false;
  transfers: Transferable[][] = [];
  private scope: {
    onmessage: ((event: MessageEvent) => void) | null;
    postMessage: (m: unknown) => void;
  };

  constructor(handler: Handler) {
    FakeWorker.created.push(this);
    this.scope = {
      onmessage: null,
      postMessage: (message: unknown) => {
        if (this.terminated) return;
        queueMicrotask(() => this.onmessage?.({ data: message } as MessageEvent));
      },
    };
    expose(handler, "testing", this.scope);
  }

  postMessage(message: unknown, transfer: Transferable[]) {
    this.transfers.push(transfer);
    queueMicrotask(() => this.scope.onmessage?.({ data: message } as MessageEvent));
  }

  terminate() {
    this.terminated = true;
  }
}

afterEach(() => {
  FakeWorker.created = [];
  vi.useRealTimers();
});

const caught = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error as ToolError,
  );

describe("createWorkerRunner", () => {
  it("returns typed results and reuses one worker for a session", async () => {
    const runner = createWorkerRunner<number, number>(
      () => new FakeWorker((n) => ({ result: (n as number) * 2 })),
    );
    expect(await runner.run(2)).toBe(4);
    expect(await runner.run(5)).toBe(10);
    expect(FakeWorker.created).toHaveLength(1);
    runner.dispose();
  });

  it("creates the worker lazily, on the first job", () => {
    const factory = vi.fn(() => new FakeWorker(() => ({ result: 1 })));
    createWorkerRunner(factory);
    expect(factory).not.toHaveBeenCalled();
  });

  it("passes transferables to postMessage", async () => {
    const runner = createWorkerRunner<ArrayBuffer, number>(
      () => new FakeWorker((b) => ({ result: (b as ArrayBuffer).byteLength })),
    );
    const buffer = new ArrayBuffer(8);
    expect(await runner.run(buffer, { transfer: [buffer] })).toBe(8);
    expect(FakeWorker.created[0]?.transfers[0]).toEqual([buffer]);
  });

  it("reports progress", async () => {
    const runner = createWorkerRunner<null, string>(
      () =>
        new FakeWorker((_r, { progress }) => {
          progress(0.5, "half");
          progress(1);
          return { result: "done" };
        }),
    );
    const onProgress = vi.fn();
    expect(await runner.run(null, { onProgress })).toBe("done");
    expect(onProgress.mock.calls).toEqual([
      [{ value: 0.5, label: "half" }],
      [{ value: 1, label: undefined }],
    ]);
  });

  it("maps thrown ToolErrors and other errors into the taxonomy", async () => {
    const runner = createWorkerRunner<string, never>(
      () =>
        new FakeWorker((kind) => {
          if (kind === "encrypted") throw toolErrors.encrypted("a.pdf");
          if (kind === "memory") throw new RangeError("Array buffer allocation failed");
          throw new TypeError("boom");
        }),
    );
    const encrypted = await caught(runner.run("encrypted"));
    expect(encrypted).toBeInstanceOf(ToolError);
    expect(encrypted).toMatchObject({ code: "E_ENCRYPTED", fileName: "a.pdf" });
    expect(await caught(runner.run("memory"))).toMatchObject({ code: "E_OUT_OF_MEMORY" });
    const unknown = await caught(runner.run("other"));
    expect(unknown).toMatchObject({ code: "E_UNKNOWN", details: "TypeError: boom" });
    expect(unknown.message).toBe(
      "Something unexpected happened while testing. Nothing was uploaded. Try again.",
    );
  });

  it("cancels: terminates the worker, rejects with E_CANCELLED, and recovers", async () => {
    let release: () => void = () => {};
    const runner = createWorkerRunner<string, string>(
      () =>
        new FakeWorker(async (request) => {
          if (request === "slow") await new Promise<void>((resolve) => (release = resolve));
          return { result: String(request) };
        }),
    );
    const controller = new AbortController();
    const job = runner.run("slow", { signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    expect(await caught(job)).toMatchObject({ code: "E_CANCELLED" });
    expect(FakeWorker.created[0]?.terminated).toBe(true);
    release();
    // The next job starts a fresh worker.
    expect(await runner.run("next")).toBe("next");
    expect(FakeWorker.created).toHaveLength(2);
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const runner = createWorkerRunner(() => new FakeWorker(() => ({ result: 1 })));
    const controller = new AbortController();
    controller.abort();
    expect(await caught(runner.run(null, { signal: controller.signal }))).toMatchObject({
      code: "E_CANCELLED",
    });
  });

  it("times out: terminates the worker and rejects with E_TIMEOUT", async () => {
    vi.useFakeTimers();
    const runner = createWorkerRunner(() => new FakeWorker(() => new Promise(() => {})));
    const job = caught(runner.run(null, { timeoutMs: 1000, timeoutMessage: "Too slow." }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await job).toMatchObject({ code: "E_TIMEOUT", message: "Too slow." });
    expect(FakeWorker.created[0]?.terminated).toBe(true);
  });

  it("rejects pending jobs when the worker fails to start", async () => {
    const runner = createWorkerRunner(() => new FakeWorker(() => new Promise(() => {})));
    const job = caught(runner.run(null));
    FakeWorker.created[0]?.onerror?.({ message: "failed", preventDefault() {} } as ErrorEvent);
    expect(await job).toMatchObject({ code: "E_UNKNOWN", details: "failed" });
  });
});

describe("runInWorker", () => {
  it("runs one job in a fresh worker and terminates it", async () => {
    expect(await runInWorker(() => new FakeWorker((n) => ({ result: (n as number) + 1 })), 1)).toBe(
      2,
    );
    expect(FakeWorker.created[0]?.terminated).toBe(true);
  });
});
