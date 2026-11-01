"use client";

// Batch state shared by the image tools (P6-T03): adding files (limits, magic
// bytes, header check), processing them on a worker pool with a concurrency
// of 2 (1 on phones), per-file status and results, cancel, ZIP and reset.

import { useCallback, useEffect, useRef, useState } from "react";
import { isToolError, toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { readAsArrayBuffer } from "@/lib/files/read";
import { readImageInfo, type ImageInfo, type ImageKind } from "@/lib/image/formats";
import { checkPixels, inspectImage } from "@/lib/image/pipeline";
import { createImagePool, forEachLimited, type ImagePool } from "@/lib/image/pool";
import type { ToolDefinition } from "@/tools/types";

/** Largest image decoded on each device class (P6-T10 tunes these). */
export const MAX_PIXELS = { desktop: 120_000_000, mobile: 50_000_000 } as const;

/** Header bytes read to check a file when it is added; the whole file only when needed. */
const HEAD_BYTES = 2 * 2 ** 20;

export type ImageResult = {
  blob: Blob;
  name: string;
  width: number;
  height: number;
  /** Object URLs for the ComparisonSlider (the result itself, or downscaled previews). */
  beforeUrl?: string;
  afterUrl?: string;
  /** Tool-specific facts, e.g. "original kept". */
  note?: string;
};

export type ImageEntry<Extra = undefined> = {
  id: string;
  file: File;
  status: "checking" | "ready" | "processing" | "done" | "error";
  info?: ImageInfo;
  /** Object URL of the file itself, when the browser can show it. */
  thumbnail?: string;
  error?: string;
  warning?: string;
  /** Tool-specific data from `inspect`, e.g. the metadata report. */
  extra?: Extra;
  result?: ImageResult;
};

export type Phase = "idle" | "processing" | "done";

type Options<Extra> = {
  meta: ToolDefinition;
  accepted: readonly ImageKind[];
  /** Extra per-file check after the header check (e.g. read metadata), on the pool. */
  inspect?: (entry: ImageEntry<Extra>, info: ImageInfo, pool: ImagePool) => Promise<Extra>;
  /** Warning shown for a file (e.g. "Animated GIF: only the first frame is used"). */
  warn?: (info: ImageInfo) => string | undefined;
};

export type ProcessContext = { pool: ImagePool; signal: AbortSignal; bytes: ArrayBuffer };

let lastId = 0;
const nextId = () => `image-${++lastId}`;

/** Kinds every supported browser can show in an <img>. */
const DISPLAYABLE = new Set<ImageKind>(["jpeg", "png", "webp", "gif", "bmp", "avif"]);

function revokeResult(result?: ImageResult) {
  if (!result) return;
  if (result.beforeUrl) URL.revokeObjectURL(result.beforeUrl);
  if (result.afterUrl) URL.revokeObjectURL(result.afterUrl);
}

export function useImageBatch<Extra = undefined>({
  meta,
  accepted,
  inspect,
  warn,
}: Options<Extra>) {
  const [entries, setEntries] = useState<ImageEntry<Extra>[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<{ value: number; label?: string }>({ value: 0 });
  const [batchError, setBatchError] = useState<ToolError | null>(null);
  const [alert, setAlert] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const live = useRef(new Map<string, ImageEntry<Extra>>());
  const pool = useRef<ImagePool | null>(null);
  const checker = useRef<ImagePool | null>(null);
  const abort = useRef<AbortController | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    live.current = new Map(entries.map((entry) => [entry.id, entry]));
  }, [entries]);

  // Release workers and object URLs when leaving the page.
  useEffect(() => {
    const current = live;
    return () => {
      abort.current?.abort();
      pool.current?.dispose();
      checker.current?.dispose();
      for (const entry of current.current.values()) {
        if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail);
        revokeResult(entry.result);
      }
    };
  }, []);

  const update = useCallback((id: string, patch: Partial<ImageEntry<Extra>>) => {
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  /** Options or the list changed: earlier results no longer match. */
  const invalidate = useCallback(() => {
    setEntries((current) => {
      if (!current.some((e) => e.result || e.status === "done")) return current;
      return current.map((e) => {
        if (!e.result && e.status !== "done") return e;
        revokeResult(e.result);
        return { ...e, result: undefined, status: e.status === "done" ? "ready" : e.status };
      });
    });
    setBatchError(null);
    setPhase((p) => (p === "done" ? "idle" : p));
  }, []);

  async function check(entry: ImageEntry<Extra>) {
    try {
      const head = new Uint8Array(await readAsArrayBuffer(entry.file.slice(0, HEAD_BYTES)));
      let bytes = head;
      // Headers past the first bytes (large metadata) or GIF frames: read it all.
      if (entry.file.size > HEAD_BYTES && (!readImageInfo(head) || head[0] === 0x47)) {
        bytes = new Uint8Array(await readAsArrayBuffer(entry.file));
      }
      const info = inspectImage(entry.file.name, bytes, accepted, meta.name);
      checkPixels(entry.file.name, info, { maxPixels: MAX_PIXELS[getDeviceClass()] });
      let extra: Extra | undefined;
      if (inspect) {
        checker.current ??= createImagePool(1);
        extra = await inspect(entry, info, checker.current);
      }
      if (!live.current.has(entry.id)) return;
      update(entry.id, {
        status: "ready",
        info,
        extra,
        warning: warn?.(info) ?? entry.warning,
        thumbnail: DISPLAYABLE.has(info.kind) ? URL.createObjectURL(entry.file) : undefined,
      });
    } catch (error) {
      if (!live.current.has(entry.id)) return;
      const toolError = toToolError(error, "checking the image");
      update(entry.id, { status: "error", error: toolError.message });
      setAlert(toolError.message);
    }
  }

  function addFiles(files: File[]) {
    const accepted = entries.filter((e) => e.status !== "error");
    const checks = checkLimits(files, meta.limits, getDeviceClass(), {
      count: accepted.length,
      bytes: accepted.reduce((sum, e) => sum + e.file.size, 0),
    });
    const added = files.map((file, index): ImageEntry<Extra> => {
      const limit = checks[index] ?? { status: "ok" };
      return {
        id: nextId(),
        file,
        status: limit.status === "reject" ? "error" : "checking",
        error: limit.status === "reject" ? limit.error.message : undefined,
        warning: limit.status === "warn" ? limit.message : undefined,
      };
    });
    const rejected = added.find((e) => e.status === "error");
    if (rejected?.error) setAlert(rejected.error);
    for (const entry of added) live.current.set(entry.id, entry);
    setEntries((current) => [...current, ...added]);
    invalidate();
    for (const entry of added) {
      if (entry.status === "checking") queue.current = queue.current.then(() => check(entry));
    }
  }

  function remove(id: string) {
    const entry = live.current.get(id);
    if (entry?.thumbnail) URL.revokeObjectURL(entry.thumbnail);
    revokeResult(entry?.result);
    live.current.delete(id);
    setEntries((current) => current.filter((e) => e.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    setPhase((p) => (p === "done" && live.current.size === 0 ? "idle" : p));
  }

  function reset() {
    abort.current?.abort();
    for (const entry of live.current.values()) {
      if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail);
      revokeResult(entry.result);
    }
    live.current.clear();
    setEntries([]);
    setPhase("idle");
    setBatchError(null);
    setSelectedId(null);
  }

  /**
   * Processes every ready file with `task`. Files that fail keep their own
   * error; the others still finish. Cancel stops everything.
   */
  async function run(
    task: (entry: ImageEntry<Extra>, context: ProcessContext) => Promise<ImageResult>,
    labels: { action: string },
  ) {
    const todo = entries.filter((e) => e.status === "ready" || e.status === "done");
    if (todo.length === 0 || phase === "processing") return;
    const controller = new AbortController();
    abort.current = controller;
    const { signal } = controller;
    setBatchError(null);
    setPhase("processing");
    setProgress({ value: 0, label: `${labels.action} 1 of ${todo.length}` });
    pool.current ??= createImagePool(2);
    const concurrency = getDeviceClass() === "mobile" ? 1 : 2;
    let finished = 0;
    let failed = 0;
    let firstDone: string | null = null;
    for (const entry of todo) {
      revokeResult(entry.result);
      update(entry.id, { status: "processing", result: undefined, error: undefined });
    }
    try {
      await forEachLimited(
        todo,
        concurrency,
        async (entry) => {
          try {
            const bytes = await readAsArrayBuffer(entry.file);
            if (signal.aborted) throw toolErrors.cancelled();
            const result = await task(entry, { pool: pool.current!, signal, bytes });
            if (signal.aborted) {
              revokeResult(result);
              throw toolErrors.cancelled();
            }
            firstDone ??= entry.id;
            update(entry.id, { status: "done", result });
          } catch (error) {
            const toolError = toToolError(
              error,
              `${labels.action.toLowerCase()} ${entry.file.name}`,
            );
            if (toolError.code === "E_CANCELLED") throw toolError;
            failed++;
            update(entry.id, { status: "error", error: toolError.message });
            // Out of memory affects the whole batch: say so once, prominently.
            if (toolError.code === "E_OUT_OF_MEMORY") setBatchError(toolError);
          } finally {
            finished++;
            setProgress({
              value: finished / todo.length,
              label: `${labels.action} ${Math.min(finished + 1, todo.length)} of ${todo.length}`,
            });
          }
        },
        signal,
      );
      if (signal.aborted) throw toolErrors.cancelled();
      setSelectedId((current) => (current && live.current.has(current) ? current : firstDone));
      setPhase("done");
      if (failed > 0) setAlert(`${failed} of ${todo.length} images couldn’t be processed.`);
    } catch (error) {
      if (!isToolError(error) || error.code !== "E_CANCELLED") throw error;
      // Cancelled: the workers were terminated; files go back to ready.
      setEntries((current) =>
        current.map((e) => {
          if (e.status !== "processing" && e.status !== "done") return e;
          revokeResult(e.result);
          return { ...e, status: "ready", result: undefined };
        }),
      );
      setPhase("idle");
    } finally {
      abort.current = null;
    }
  }

  const cancel = () => abort.current?.abort();

  const ready = entries.filter((e) => e.status === "ready" || e.status === "done");
  const done = entries.filter((e) => e.status === "done" && e.result);
  const checking = entries.some((e) => e.status === "checking");
  const selected =
    entries.find((e) => e.id === selectedId) ??
    done[0] ??
    entries.find((e) => e.status !== "error");

  return {
    entries,
    ready,
    done,
    checking,
    selected,
    select: setSelectedId,
    phase,
    progress,
    batchError,
    alert,
    setAlert,
    addFiles,
    remove,
    reset,
    invalidate,
    run,
    cancel,
  };
}

export type ImageBatch<Extra = undefined> = ReturnType<typeof useImageBatch<Extra>>;
