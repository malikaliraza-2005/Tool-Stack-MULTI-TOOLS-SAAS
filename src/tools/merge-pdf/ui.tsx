"use client";

import { Download, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { FileList, type FileListItem } from "@/components/tool/FileList";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { userFileName } from "@/lib/files/names";
import { readAsArrayBuffer } from "@/lib/files/read";
import { describeKind, sniffFile } from "@/lib/files/sniff";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
// Types only: pdf-lib stays in the worker chunk.
import type { MergeJob, MergeJobResult } from "./logic";
import { meta } from "./meta";

const DEFAULT_OUTPUT_NAME = "merged.pdf";
const THUMBNAIL_WIDTH = 40;
const LIMITS_HINT = "PDF · up to 500 MB in total (150 MB on phones and tablets)";

type Entry = {
  id: string;
  file: File;
  status: "checking" | "ready" | "error";
  pageCount?: number;
  error?: string;
  warning?: string;
  thumbnail?: string;
};

type Result = { blob: Blob; pageCount: number; fileCount: number };

// Plain counter ids: crypto.randomUUID is missing in some in-app browsers.
let lastEntryId = 0;
const nextEntryId = () => `file-${++lastEntryId}`;
type Phase = "idle" | "merging" | "done";

const createRunner = () =>
  createWorkerRunner<MergeJob, MergeJobResult>(
    () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
  );

export default function MergePdfUI() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [mergeError, setMergeError] = useState<ToolError | null>(null);
  const [progress, setProgress] = useState<{ value: number; label?: string }>({ value: 0 });
  const [outputName, setOutputName] = useState(DEFAULT_OUTPUT_NAME);
  const [alert, setAlert] = useState("");
  const [addError, setAddError] = useState<ToolError | null>(null);

  // Separate workers: cancelling a merge must not kill file checks.
  const inspector = useRef<WorkerRunner<MergeJob, MergeJobResult> | null>(null);
  const merger = useRef<WorkerRunner<MergeJob, MergeJobResult> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const live = useRef(new Map<string, Entry>());
  const dropZone = useRef<DropZoneHandle>(null);
  const mergeButton = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useRef<"dropzone" | "merge" | null>(null);
  const hintId = useId();

  useEffect(() => {
    live.current = new Map(entries.map((entry) => [entry.id, entry]));
  }, [entries]);

  // Release workers and thumbnails when leaving the page.
  useEffect(() => {
    const thumbnails = live;
    return () => {
      inspector.current?.dispose();
      merger.current?.dispose();
      for (const entry of thumbnails.current.values()) {
        if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail);
      }
    };
  }, []);

  useEffect(() => {
    const target = focusAfterRender.current;
    focusAfterRender.current = null;
    if (target === "dropzone") dropZone.current?.focus();
    if (target === "merge") mergeButton.current?.focus();
  });

  const update = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }, []);

  /** Any change to the list makes an earlier result stale. */
  const invalidateResult = useCallback(() => {
    setResult(null);
    setMergeError(null);
    setPhase((current) => (current === "done" ? "idle" : current));
  }, []);

  async function inspect(entry: Entry) {
    try {
      const kind = await sniffFile(entry.file);
      if (kind !== "pdf") {
        throw toolErrors.unsupportedFormat({
          name: entry.file.name,
          detected: kind ? describeKind(kind) : undefined,
          tool: meta.name,
          formats: "PDF files",
        });
      }
      const bytes = await readAsArrayBuffer(entry.file);
      inspector.current ??= createRunner();
      const checked = await inspector.current.run(
        { op: "inspect", file: { name: entry.file.name, bytes } },
        { transfer: [bytes] },
      );
      if (!live.current.has(entry.id)) return;
      update(entry.id, {
        status: "ready",
        pageCount: checked.op === "inspect" ? checked.pageCount : undefined,
      });
    } catch (error) {
      if (!live.current.has(entry.id)) return;
      const toolError = toToolError(error, "checking the file");
      update(entry.id, { status: "error", error: toolError.message });
      setAlert(toolError.message);
      return;
    }
    // Thumbnail last: pdf.js loads on intent, after the file is known to be good.
    const { renderPdfThumbnail } = await import("@/lib/pdf/thumbnail");
    const png = await renderPdfThumbnail(entry.file, THUMBNAIL_WIDTH);
    if (!png) return;
    const url = URL.createObjectURL(png);
    if (live.current.has(entry.id)) update(entry.id, { thumbnail: url });
    else URL.revokeObjectURL(url);
  }

  function addFiles(files: File[]) {
    setAddError(null);
    try {
      addFilesUnsafe(files);
    } catch (error) {
      // Never fail silently: show what went wrong next to the drop zone.
      const toolError = toToolError(error, "adding the files");
      setAddError(toolError);
      setAlert(toolError.message);
    }
  }

  function addFilesUnsafe(files: File[]) {
    const accepted = entries.filter((entry) => entry.status !== "error");
    const checks = checkLimits(files, meta.limits, getDeviceClass(), {
      count: accepted.length,
      bytes: accepted.reduce((sum, entry) => sum + entry.file.size, 0),
    });
    const added: Entry[] = files.map((file, index) => {
      const check = checks[index] ?? { status: "ok" };
      return {
        id: nextEntryId(),
        file,
        status: check.status === "reject" ? "error" : "checking",
        error: check.status === "reject" ? check.error.message : undefined,
        warning: check.status === "warn" ? check.message : undefined,
      };
    });
    const rejected = added.find((entry) => entry.status === "error");
    if (rejected?.error) setAlert(rejected.error);
    for (const entry of added) live.current.set(entry.id, entry);
    setEntries((current) => [...current, ...added]);
    invalidateResult();
    // One file at a time keeps memory use flat (architecture §8.3).
    for (const entry of added) {
      if (entry.status === "checking") queue.current = queue.current.then(() => inspect(entry));
    }
  }

  function removeEntry(id: string) {
    const entry = live.current.get(id);
    if (entry?.thumbnail) URL.revokeObjectURL(entry.thumbnail);
    live.current.delete(id);
    // The list unmounts when empty; the drop zone takes focus instead.
    if (live.current.size === 0) focusAfterRender.current = "dropzone";
    setEntries((current) => current.filter((e) => e.id !== id));
    invalidateResult();
  }

  function reorder(ids: string[]) {
    setEntries((current) => ids.flatMap((id) => current.find((entry) => entry.id === id) ?? []));
    invalidateResult();
  }

  function startOver() {
    abort.current?.abort();
    for (const entry of entries) if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail);
    live.current.clear();
    setEntries([]);
    setResult(null);
    setMergeError(null);
    setPhase("idle");
    setOutputName(DEFAULT_OUTPUT_NAME);
    focusAfterRender.current = "dropzone";
  }

  const ready = useMemo(() => entries.filter((entry) => entry.status === "ready"), [entries]);
  const checking = entries.some((entry) => entry.status === "checking");
  const pages = ready.reduce((sum, entry) => sum + (entry.pageCount ?? 0), 0);
  const bytes = ready.reduce((sum, entry) => sum + entry.file.size, 0);
  const canMerge = ready.length >= 2 && !checking;
  const fileName = userFileName(outputName, "pdf", DEFAULT_OUTPUT_NAME);

  async function merge() {
    if (!canMerge || phase === "merging") return;
    const controller = new AbortController();
    abort.current = controller;
    setMergeError(null);
    setProgress({ value: 0, label: "Reading files" });
    setPhase("merging");
    try {
      const buffers = await Promise.all(ready.map((entry) => readAsArrayBuffer(entry.file)));
      if (controller.signal.aborted) throw toolErrors.cancelled();
      merger.current ??= createRunner();
      const merged = await merger.current.run(
        {
          op: "merge",
          files: ready.map((entry, index) => ({ name: entry.file.name, bytes: buffers[index]! })),
        },
        { transfer: buffers, signal: controller.signal, onProgress: setProgress },
      );
      if (merged.op !== "merge") throw toolErrors.unknown("merging the PDFs");
      setResult({
        blob: new Blob([merged.bytes], { type: "application/pdf" }),
        pageCount: merged.pageCount,
        fileCount: ready.length,
      });
      setPhase("done");
    } catch (error) {
      const toolError = toToolError(error, "merging the PDFs");
      setPhase("idle");
      if (toolError.code === "E_CANCELLED") {
        focusAfterRender.current = "merge";
        return;
      }
      // A file that failed only now (e.g. changed on disk) is marked in the list.
      const culprit = ready.find((entry) => entry.file.name === toolError.fileName);
      if (culprit) update(culprit.id, { status: "error", error: toolError.message });
      setMergeError(toolError);
    } finally {
      abort.current = null;
    }
  }

  const addErrorState = addError && (
    <ErrorState
      title="The files couldn’t be added"
      description={addError.message}
      action={
        addError.details ? (
          <details className="text-small text-fg-muted">
            <summary className="cursor-pointer">Details</summary>
            <p className="mt-1 font-mono break-all">{addError.details}</p>
          </details>
        ) : undefined
      }
    />
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {addErrorState}
        <DropZone
          ref={dropZone}
          accept={meta.input.accepts!}
          acceptLabel="PDF files"
          onFiles={addFiles}
          title="Drop PDF files here"
          description="Or choose them from your device. Your files stay on this device."
          hint={LIMITS_HINT}
        />
      </div>
    );
  }

  const listItems: FileListItem[] = entries.map((entry) => ({
    id: entry.id,
    name: entry.file.name,
    size: entry.file.size,
    type: "PDF",
    meta: entry.pageCount !== undefined ? plural(entry.pageCount, "page") : undefined,
    thumbnail: entry.thumbnail,
    busy: entry.status === "checking",
    status: entry.error
      ? { tone: "error", message: entry.error }
      : entry.warning
        ? { tone: "warning", message: entry.warning }
        : undefined,
  }));

  const excluded = entries.filter((entry) => entry.status === "error").length;

  return (
    <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui text-fg">
            Files <span className="font-mono text-fg-muted tabular-nums">({entries.length})</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={startOver} disabled={phase === "merging"}>
            <RotateCcw aria-hidden />
            Remove all
          </Button>
        </div>
        <FileList
          items={listItems}
          label="Files to merge, in order"
          onRemove={removeEntry}
          onReorder={phase === "merging" ? undefined : reorder}
          onEmptied={() => (focusAfterRender.current = "dropzone")}
        />
        <p className="text-small text-fg-muted">
          Pages are merged in this order. Drag a file by its handle, or use the arrow buttons.
        </p>
        <DropZone
          size="sm"
          accept={meta.input.accepts!}
          acceptLabel="PDF files"
          onFiles={addFiles}
          disabled={phase === "merging"}
          title="Add more PDFs"
          description="Drop files here, or choose more from your device."
          buttonLabel="Add files"
        />
        {addErrorState}
      </div>

      <aside
        aria-label="Merge options"
        className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-6"
      >
        <Field
          label="File name"
          description="Name of the merged PDF. You can change it before downloading."
        >
          <Input
            value={outputName}
            onChange={(event) => setOutputName(event.target.value)}
            onBlur={() => setOutputName(fileName)}
            placeholder={DEFAULT_OUTPUT_NAME}
            autoComplete="off"
            spellCheck={false}
            disabled={phase === "merging"}
          />
        </Field>

        <dl className="grid grid-cols-3 gap-3 rounded-md border border-border bg-surface-2 p-3">
          {[
            { term: "Files", value: `${ready.length}` },
            { term: "Pages", value: pages.toLocaleString("en-US") },
            { term: "Size", value: formatBytes(bytes) },
          ].map(({ term, value }) => (
            <div key={term} className="flex flex-col gap-0.5">
              <dt className="text-micro text-fg-muted uppercase">{term}</dt>
              <dd className="font-mono text-ui text-fg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {phase === "merging" && (
          <ProcessingState
            label="Merging PDFs"
            value={progress.value}
            detail={progress.label}
            onCancel={() => abort.current?.abort()}
            focusCancel
          />
        )}

        {phase === "done" && result && (
          <ResultPanel
            title={`${fileName} is ready`}
            summary={[
              `${plural(result.fileCount, "file")} → 1 PDF`,
              plural(result.pageCount, "page"),
              formatBytes(result.blob.size),
            ]}
            primary={
              <Button variant="primary" onClick={() => downloadBlob(result.blob, fileName)}>
                <Download aria-hidden />
                Download merged PDF
              </Button>
            }
            secondary={
              <Button variant="secondary" onClick={startOver}>
                Start over
              </Button>
            }
          />
        )}

        {phase === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              ref={mergeButton}
              variant="primary"
              size="lg"
              className="w-full"
              aria-disabled={!canMerge || undefined}
              aria-describedby={hintId}
              onClick={merge}
            >
              {ready.length >= 2 ? `Merge ${ready.length} PDFs` : "Merge PDFs"}
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {checking
                ? "Checking files…"
                : ready.length < 2
                  ? "Add at least 2 PDF files to merge."
                  : excluded > 0
                    ? `${plural(excluded, "file")} with problems will be left out.`
                    : "Your files stay on this device."}
            </p>
          </div>
        )}

        {mergeError && (
          <ErrorState
            title="The PDFs couldn’t be merged"
            description={mergeError.message}
            action={
              mergeError.details ? (
                <details className="text-small text-fg-muted">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-1 font-mono break-all">{mergeError.details}</p>
                </details>
              ) : undefined
            }
          />
        )}
      </aside>

      <p role="alert" className="sr-only">
        {alert}
      </p>
    </div>
  );
}
