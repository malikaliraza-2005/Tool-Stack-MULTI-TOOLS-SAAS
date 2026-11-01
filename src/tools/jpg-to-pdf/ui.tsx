"use client";

import { Download, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as z from "zod/mini";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { FileList, type FileListItem } from "@/components/tool/FileList";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { baseName, sanitizeFileName, userFileName } from "@/lib/files/names";
import { readAsArrayBuffer } from "@/lib/files/read";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
import type { Margin, Orientation, PageSize } from "./layout";
// Types only: pdf-lib stays in the worker chunk.
import type { JpgToPdfJob, JpgToPdfJobResult } from "./logic";
import { meta } from "./meta";
import { UseInAnotherTool } from "@/components/tool/UseInAnotherTool";

const optionsSchema = z.object({
  pageSize: z.enum(["fit", "a4", "letter"]),
  orientation: z.enum(["auto", "portrait", "landscape"]),
  margin: z.enum(["none", "small", "large"]),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { pageSize: "fit", orientation: "auto", margin: "none" };

const PAGE_SIZES = [
  { value: "fit", label: "Fit to image" },
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
];
const ORIENTATIONS = [
  { value: "auto", label: "Auto" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];
const MARGINS = [
  { value: "none", label: "No margin" },
  { value: "small", label: "Small (12 pt)" },
  { value: "large", label: "Large (36 pt)" },
];

const DEFAULT_OUTPUT_NAME = "images.pdf";
const LIMITS_HINT = "JPG, PNG, WebP, GIF, BMP, AVIF, HEIC · up to 100 MB per image, 100 images";

type Entry = {
  id: string;
  file: File;
  status: "checking" | "ready" | "error";
  size?: { width: number; height: number };
  error?: string;
  warning?: string;
  thumbnail?: string;
};

type Result = { blob: Blob; pageCount: number };
type Phase = "idle" | "converting" | "done";

// Plain counter ids: crypto.randomUUID is missing in some in-app browsers.
let lastEntryId = 0;
const nextEntryId = () => `image-${++lastEntryId}`;

const createRunner = () =>
  createWorkerRunner<JpgToPdfJob, JpgToPdfJobResult>(
    () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
  );

export default function JpgToPdfUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [convertError, setConvertError] = useState<ToolError | null>(null);
  const [progress, setProgress] = useState<{ value: number; label?: string }>({ value: 0 });
  const [outputName, setOutputName] = useState<string | null>(null);
  const [alert, setAlert] = useState("");

  // Separate workers: cancelling a conversion must not kill file checks.
  const inspector = useRef<WorkerRunner<JpgToPdfJob, JpgToPdfJobResult> | null>(null);
  const converter = useRef<WorkerRunner<JpgToPdfJob, JpgToPdfJobResult> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const live = useRef(new Map<string, Entry>());
  const dropZone = useRef<DropZoneHandle>(null);
  const convertButton = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useRef<"dropzone" | "convert" | null>(null);
  const hintId = useId();

  useEffect(() => {
    live.current = new Map(entries.map((entry) => [entry.id, entry]));
  }, [entries]);

  // Release workers and thumbnails when leaving the page.
  useEffect(() => {
    const thumbnails = live;
    return () => {
      inspector.current?.dispose();
      converter.current?.dispose();
      for (const entry of thumbnails.current.values()) {
        if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail);
      }
    };
  }, []);

  useEffect(() => {
    const target = focusAfterRender.current;
    focusAfterRender.current = null;
    if (target === "dropzone") dropZone.current?.focus();
    if (target === "convert") convertButton.current?.focus();
  });

  const update = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }, []);

  /** Any change to the list or the layout makes an earlier result stale. */
  const invalidateResult = useCallback(() => {
    setResult(null);
    setConvertError(null);
    setPhase((current) => (current === "done" ? "idle" : current));
  }, []);

  async function inspect(entry: Entry) {
    try {
      const bytes = await readAsArrayBuffer(entry.file);
      inspector.current ??= createRunner();
      const checked = await inspector.current.run(
        { op: "inspect", file: { name: entry.file.name, bytes } },
        { transfer: [bytes] },
      );
      if (!live.current.has(entry.id) || checked.op !== "inspect") return;
      // The file itself is the thumbnail, except HEIC, which most browsers can't show.
      update(entry.id, {
        status: "ready",
        size: { width: checked.width, height: checked.height },
        thumbnail: checked.kind === "heic" ? undefined : URL.createObjectURL(entry.file),
      });
    } catch (error) {
      if (!live.current.has(entry.id)) return;
      const toolError = toToolError(error, "checking the image");
      update(entry.id, { status: "error", error: toolError.message });
      setAlert(toolError.message);
    }
  }

  function addFiles(files: File[]) {
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
    // One image at a time keeps memory use flat (architecture §8.3).
    for (const entry of added) {
      if (entry.status === "checking") queue.current = queue.current.then(() => inspect(entry));
    }
  }

  function removeEntry(id: string) {
    const entry = live.current.get(id);
    if (entry?.thumbnail) URL.revokeObjectURL(entry.thumbnail);
    live.current.delete(id);
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
    setConvertError(null);
    setPhase("idle");
    setOutputName(null);
    focusAfterRender.current = "dropzone";
  }

  const ready = useMemo(() => entries.filter((entry) => entry.status === "ready"), [entries]);
  const checking = entries.some((entry) => entry.status === "checking");
  const bytes = ready.reduce((sum, entry) => sum + entry.file.size, 0);
  const canConvert = ready.length >= 1 && !checking;
  // One image: named after it; several: images.pdf. The user can rename either.
  const suggested =
    ready.length === 1 && ready[0]
      ? `${sanitizeFileName(baseName(ready[0].file.name)) || "image"}.pdf`
      : DEFAULT_OUTPUT_NAME;
  const fileName = userFileName(outputName ?? suggested, "pdf", suggested);

  async function convert() {
    if (!canConvert || phase === "converting") return;
    const controller = new AbortController();
    abort.current = controller;
    setConvertError(null);
    setProgress({ value: 0, label: "Reading images" });
    setPhase("converting");
    try {
      const buffers = await Promise.all(ready.map((entry) => readAsArrayBuffer(entry.file)));
      if (controller.signal.aborted) throw toolErrors.cancelled();
      converter.current ??= createRunner();
      const output = await converter.current.run(
        {
          op: "convert",
          files: ready.map((entry, index) => ({ name: entry.file.name, bytes: buffers[index]! })),
          options,
        },
        { transfer: buffers, signal: controller.signal, onProgress: setProgress },
      );
      if (output.op !== "convert") throw toolErrors.unknown("converting the images");
      setResult({
        blob: new Blob([output.bytes], { type: "application/pdf" }),
        pageCount: output.pageCount,
      });
      setPhase("done");
    } catch (error) {
      const toolError = toToolError(error, "converting the images");
      setPhase("idle");
      if (toolError.code === "E_CANCELLED") {
        focusAfterRender.current = "convert";
        return;
      }
      const culprit = ready.find((entry) => entry.file.name === toolError.fileName);
      if (culprit) update(culprit.id, { status: "error", error: toolError.message });
      setConvertError(toolError);
    } finally {
      abort.current = null;
    }
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <DropZone
          ref={dropZone}
          accept={meta.input.accepts!}
          acceptLabel="images"
          onFiles={addFiles}
          title="Drop images here"
          description="Or choose them from your device. Your images stay on this device."
          hint={LIMITS_HINT}
        />
        <p role="alert" className="sr-only">
          {alert}
        </p>
      </div>
    );
  }

  const listItems: FileListItem[] = entries.map((entry) => ({
    id: entry.id,
    name: entry.file.name,
    size: entry.file.size,
    type: "Image",
    meta: entry.size ? `${entry.size.width} × ${entry.size.height}` : undefined,
    thumbnail: entry.thumbnail,
    busy: entry.status === "checking",
    status: entry.error
      ? { tone: "error", message: entry.error }
      : entry.warning
        ? { tone: "warning", message: entry.warning }
        : undefined,
  }));
  const excluded = entries.filter((entry) => entry.status === "error").length;
  const busy = phase === "converting";
  const setOption = (patch: Partial<Options>) => {
    setOptions(patch);
    invalidateResult();
  };

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui text-fg">
            Images <span className="font-mono text-fg-muted tabular-nums">({entries.length})</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={startOver} disabled={busy}>
            <RotateCcw aria-hidden />
            Remove all
          </Button>
        </div>
        <FileList
          items={listItems}
          label="Images, one page each, in order"
          onRemove={removeEntry}
          onReorder={busy ? undefined : reorder}
          onEmptied={() => (focusAfterRender.current = "dropzone")}
        />
        <p className="text-small text-fg-muted">
          Each image becomes one page, in this order. Drag an image by its handle, or use the arrow
          buttons.
        </p>
        <DropZone
          size="sm"
          accept={meta.input.accepts!}
          acceptLabel="images"
          onFiles={addFiles}
          disabled={busy}
          title="Add more images"
          description="Drop images here, or choose more from your device."
          buttonLabel="Add images"
        />
      </div>

      <aside
        aria-label="PDF options"
        className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-6"
      >
        <Field label="Page size">
          <Select
            options={PAGE_SIZES}
            value={options.pageSize}
            onValueChange={(pageSize) => setOption({ pageSize: pageSize as PageSize })}
            disabled={busy}
          />
        </Field>
        {options.pageSize !== "fit" && (
          <div className="flex flex-col gap-1.5">
            <span aria-hidden className="text-ui text-fg">
              Orientation
            </span>
            <SegmentedControl
              label="Orientation"
              options={ORIENTATIONS}
              value={options.orientation}
              onValueChange={(orientation) =>
                setOption({ orientation: orientation as Orientation })
              }
              className="self-start"
            />
          </div>
        )}
        <Field label="Margin">
          <Select
            options={MARGINS}
            value={options.margin}
            onValueChange={(margin) => setOption({ margin: margin as Margin })}
            disabled={busy}
          />
        </Field>
        <Field label="File name">
          <Input
            value={outputName ?? suggested}
            onChange={(event) => setOutputName(event.target.value)}
            onBlur={() => setOutputName(fileName)}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
        </Field>

        <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-surface-2 p-3">
          {[
            { term: "Pages", value: `${ready.length}` },
            { term: "Size", value: formatBytes(bytes) },
          ].map(({ term, value }) => (
            <div key={term} className="flex flex-col gap-0.5">
              <dt className="text-micro text-fg-muted uppercase">{term}</dt>
              <dd className="font-mono text-ui text-fg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {busy && (
          <ProcessingState
            label="Creating PDF"
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
              `${plural(ready.length, "image")} → 1 PDF`,
              plural(result.pageCount, "page"),
              formatBytes(result.blob.size),
            ]}
            primary={
              <Button variant="primary" onClick={() => downloadBlob(result.blob, fileName)}>
                <Download aria-hidden />
                Download PDF
              </Button>
            }
            secondary={
              <>
                <UseInAnotherTool outputs={[{ blob: result.blob, name: fileName }]} />
                <Button variant="secondary" onClick={startOver}>
                  Start over
                </Button>
              </>
            }
          />
        )}

        {phase === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              ref={convertButton}
              variant="primary"
              size="lg"
              className="w-full"
              aria-disabled={!canConvert || undefined}
              aria-describedby={hintId}
              onClick={convert}
            >
              {ready.length > 1 ? `Convert ${ready.length} images to PDF` : "Convert to PDF"}
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {checking
                ? "Checking images…"
                : ready.length === 0
                  ? "Add at least one image."
                  : excluded > 0
                    ? `${plural(excluded, "image")} with problems will be left out.`
                    : "Your images stay on this device."}
            </p>
          </div>
        )}

        {convertError && (
          <ErrorState
            title="The PDF couldn’t be created"
            description={convertError.message}
            action={
              convertError.details ? (
                <details className="text-small text-fg-muted">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-1 font-mono break-all">{convertError.details}</p>
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
