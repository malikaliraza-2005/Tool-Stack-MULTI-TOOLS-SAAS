"use client";

import { Download, FileArchive, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as z from "zod/mini";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { FileList, type FileListItem } from "@/components/tool/FileList";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { baseName, sanitizeFileName } from "@/lib/files/names";
import { readAsArrayBuffer } from "@/lib/files/read";
import { describeKind, sniffFile } from "@/lib/files/sniff";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
// Types only: pdf-lib stays in the worker chunk.
import type { SplitJob, SplitJobResult } from "./logic";
import { meta } from "./meta";
// Light: validates ranges and previews the output as the user types.
import { planSplit, type Part, type SplitMode, type SplitOptions } from "./plan";
import { UseInAnotherTool } from "@/components/tool/UseInAnotherTool";

const optionsSchema = z.object({
  mode: z.enum(["extract", "every", "single"]),
  every: z.number(),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { mode: "extract", every: 2 };

const THUMBNAIL_WIDTH = 40;
const LIMITS_HINT = "One PDF · up to 500 MB (150 MB on phones and tablets)";
/** Output files listed individually; all are always in the ZIP. */
const LIST_LIMIT = 100;

type Source = {
  file: File;
  status: "checking" | "ready" | "error";
  pageCount?: number;
  error?: string;
  warning?: string;
  thumbnail?: string;
};

type OutputFile = { name: string; blob: Blob; pageCount: number };
type Result = { files: OutputFile[]; zip: Blob | null; zipName: string };
type Phase = "idle" | "splitting" | "done";

const createRunner = () =>
  createWorkerRunner<SplitJob, SplitJobResult>(
    () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
  );

export default function SplitPdfUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [source, setSource] = useState<Source | null>(null);
  const [range, setRange] = useState("");
  const [everyText, setEveryText] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [splitError, setSplitError] = useState<ToolError | null>(null);
  const [progress, setProgress] = useState<{ value: number; label?: string }>({ value: 0 });
  const [alert, setAlert] = useState("");

  const inspector = useRef<WorkerRunner<SplitJob, SplitJobResult> | null>(null);
  const splitter = useRef<WorkerRunner<SplitJob, SplitJobResult> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const current = useRef<File | null>(null);
  const thumbnail = useRef<string | undefined>(undefined);
  const dropZone = useRef<DropZoneHandle>(null);
  const splitButton = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useRef<"dropzone" | "split" | null>(null);
  const hintId = useId();

  useEffect(
    () => () => {
      inspector.current?.dispose();
      splitter.current?.dispose();
      if (thumbnail.current) URL.revokeObjectURL(thumbnail.current);
    },
    [],
  );

  useEffect(() => {
    const target = focusAfterRender.current;
    focusAfterRender.current = null;
    if (target === "dropzone") dropZone.current?.focus();
    if (target === "split") splitButton.current?.focus();
  });

  const pageCount = source?.status === "ready" ? (source.pageCount ?? 0) : 0;
  const every = Math.max(1, Math.trunc(options.every) || 1);
  const everyValue = everyText ?? String(every);
  const everyError =
    options.mode === "every" && !/^\s*[1-9]\d*\s*$/.test(everyValue)
      ? "Enter a whole number of pages per file, 1 or more."
      : null;
  const splitOptions: SplitOptions =
    options.mode === "extract"
      ? { mode: "extract", range }
      : options.mode === "every"
        ? { mode: "every", every }
        : { mode: "single" };

  // The plan is computed on the page (cheap), so range errors and the file
  // count update as the user types.
  const plan = useMemo((): { parts: Part[] } | { error: string } | null => {
    if (!source || pageCount === 0) return null;
    if (options.mode === "extract" && range.trim() === "") return null;
    try {
      return { parts: planSplit(source.file.name, pageCount, splitOptions) };
    } catch (error) {
      return { error: toToolError(error, "planning the split").message };
    }
    // splitOptions is derived from these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, pageCount, options.mode, range, every]);
  const parts = plan && "parts" in plan ? plan.parts : null;
  const rangeError = options.mode === "extract" && plan && "error" in plan ? plan.error : null;

  function invalidateResult() {
    setResult(null);
    setSplitError(null);
    setPhase((value) => (value === "done" ? "idle" : value));
  }

  async function addFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    abort.current?.abort();
    if (thumbnail.current) URL.revokeObjectURL(thumbnail.current);
    thumbnail.current = undefined;
    current.current = file;
    invalidateResult();
    const [check] = checkLimits([file], meta.limits, getDeviceClass());
    if (check?.status === "reject") {
      setSource({ file, status: "error", error: check.error.message });
      setAlert(check.error.message);
      return;
    }
    setSource({
      file,
      status: "checking",
      warning: check?.status === "warn" ? check.message : undefined,
    });
    try {
      const kind = await sniffFile(file);
      if (kind !== "pdf") {
        throw toolErrors.unsupportedFormat({
          name: file.name,
          detected: kind ? describeKind(kind) : undefined,
          tool: meta.name,
          formats: "PDF files",
        });
      }
      const bytes = await readAsArrayBuffer(file);
      inspector.current ??= createRunner();
      const checked = await inspector.current.run(
        { op: "inspect", file: { name: file.name, bytes } },
        { transfer: [bytes] },
      );
      if (current.current !== file) return;
      setSource((value) =>
        value && value.file === file
          ? {
              ...value,
              status: "ready",
              pageCount: checked.op === "inspect" ? checked.pageCount : undefined,
            }
          : value,
      );
    } catch (error) {
      if (current.current !== file) return;
      const toolError = toToolError(error, "checking the file");
      setSource((value) =>
        value && value.file === file
          ? { ...value, status: "error", error: toolError.message }
          : value,
      );
      setAlert(toolError.message);
      return;
    }
    const { renderPdfThumbnail } = await import("@/lib/pdf/render");
    const png = await renderPdfThumbnail(file, THUMBNAIL_WIDTH);
    if (!png || current.current !== file) return;
    thumbnail.current = URL.createObjectURL(png);
    setSource((value) =>
      value && value.file === file ? { ...value, thumbnail: thumbnail.current } : value,
    );
  }

  function startOver() {
    abort.current?.abort();
    if (thumbnail.current) URL.revokeObjectURL(thumbnail.current);
    thumbnail.current = undefined;
    current.current = null;
    setSource(null);
    setRange("");
    setResult(null);
    setSplitError(null);
    setPhase("idle");
    focusAfterRender.current = "dropzone";
  }

  const canSplit = Boolean(parts && parts.length > 0) && !everyError && phase !== "splitting";

  async function split() {
    if (!canSplit || !source) return;
    const controller = new AbortController();
    abort.current = controller;
    setSplitError(null);
    setProgress({ value: 0, label: "Reading the file" });
    setPhase("splitting");
    try {
      const bytes = await readAsArrayBuffer(source.file);
      if (controller.signal.aborted) throw toolErrors.cancelled();
      splitter.current ??= createRunner();
      const output = await splitter.current.run(
        { op: "split", file: { name: source.file.name, bytes }, options: splitOptions },
        { transfer: [bytes], signal: controller.signal, onProgress: setProgress },
      );
      if (output.op !== "split") throw toolErrors.unknown("splitting the PDF");
      const files = output.files.map((file) => ({
        name: file.name,
        blob: new Blob([file.bytes], { type: "application/pdf" }),
        pageCount: file.pageCount,
      }));
      let zip: Blob | null = null;
      if (files.length > 1) {
        setProgress({ value: 1, label: "Creating the ZIP file" });
        const { createZip } = await import("@/lib/files/zip");
        const data = await createZip(
          await Promise.all(
            files.map(async (file) => ({
              name: file.name,
              data: new Uint8Array(await file.blob.arrayBuffer()),
              compressed: true,
            })),
          ),
        );
        zip = new Blob([data as BlobPart], { type: "application/zip" });
      }
      const base = sanitizeFileName(baseName(source.file.name)) || "document";
      setResult({ files, zip, zipName: `${base}-split.zip` });
      setPhase("done");
    } catch (error) {
      const toolError = toToolError(error, "splitting the PDF");
      setPhase("idle");
      if (toolError.code === "E_CANCELLED") {
        focusAfterRender.current = "split";
        return;
      }
      setSplitError(toolError);
      setAlert(toolError.message);
    } finally {
      abort.current = null;
    }
  }

  if (!source) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <DropZone
          ref={dropZone}
          accept={meta.input.accepts!}
          acceptLabel="PDF files"
          multiple={false}
          onFiles={addFiles}
          title="Drop a PDF here"
          description="Or choose one from your device. Your file stays on this device."
          hint={LIMITS_HINT}
          buttonLabel="Choose file"
        />
        <p role="alert" className="sr-only">
          {alert}
        </p>
      </div>
    );
  }

  const item: FileListItem = {
    id: "source",
    name: source.file.name,
    size: source.file.size,
    type: "PDF",
    meta: source.pageCount !== undefined ? plural(source.pageCount, "page") : undefined,
    thumbnail: source.thumbnail,
    busy: source.status === "checking",
    status: source.error
      ? { tone: "error", message: source.error }
      : source.warning
        ? { tone: "warning", message: source.warning }
        : undefined,
  };
  const outputPages = parts?.reduce((sum, part) => sum + part.pages.length, 0) ?? 0;
  const busy = phase === "splitting";

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui text-fg">File</h2>
          <Button variant="ghost" size="sm" onClick={startOver} disabled={busy}>
            <RotateCcw aria-hidden />
            Choose another
          </Button>
        </div>
        <FileList
          items={[item]}
          label="PDF to split"
          onRemove={startOver}
          onEmptied={() => (focusAfterRender.current = "dropzone")}
        />

        <fieldset className="flex flex-col gap-3" disabled={busy}>
          <legend className="mb-3 text-ui text-fg">How to split</legend>
          <RadioGroup
            value={options.mode}
            onValueChange={(mode) => {
              setOptions({ mode: mode as SplitMode });
              invalidateResult();
            }}
            aria-label="How to split"
          >
            <Radio value="extract" label="Extract pages into one PDF" />
            <Radio value="every" label="Every N pages (several PDFs)" />
            <Radio value="single" label="Single pages (one PDF per page)" />
          </RadioGroup>
        </fieldset>

        {options.mode === "extract" && (
          <Field
            label="Pages"
            description="For example 1-3, 5, 8- (8- means page 8 to the end). Pages come out in this order."
            error={rangeError ?? undefined}
          >
            <Input
              value={range}
              onChange={(event) => {
                setRange(event.target.value);
                invalidateResult();
              }}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={pageCount > 1 ? `1-${Math.min(3, pageCount)}` : "1"}
              disabled={busy || source.status !== "ready"}
              className="font-mono"
            />
          </Field>
        )}
        {options.mode === "every" && (
          <Field label="Pages per file" error={everyError ?? undefined} className="max-w-48">
            <Input
              value={everyValue}
              onChange={(event) => {
                const value = event.target.value;
                const parsed = /^\s*[1-9]\d*\s*$/.test(value) ? Number(value) : null;
                if (parsed !== null) setOptions({ every: parsed });
                setEveryText(parsed !== null && String(parsed) === value ? null : value);
                invalidateResult();
              }}
              inputMode="numeric"
              autoComplete="off"
              disabled={busy || source.status !== "ready"}
              className="font-mono tabular-nums"
            />
          </Field>
        )}
        {/* Announces range errors as they appear (§2.4); the Field shows them. */}
        <span aria-live="assertive" className="sr-only">
          {rangeError ?? everyError ?? ""}
        </span>
      </div>

      <aside
        aria-label="Split result"
        className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-6"
      >
        <dl className="grid grid-cols-3 gap-3 rounded-md border border-border bg-surface-2 p-3">
          {[
            { term: "Pages", value: pageCount ? pageCount.toLocaleString("en-US") : "–" },
            { term: "Files out", value: parts ? parts.length.toLocaleString("en-US") : "–" },
            { term: "Pages out", value: parts ? outputPages.toLocaleString("en-US") : "–" },
          ].map(({ term, value }) => (
            <div key={term} className="flex flex-col gap-0.5">
              <dt className="text-micro text-fg-muted uppercase">{term}</dt>
              <dd className="font-mono text-ui text-fg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {busy && (
          <ProcessingState
            label="Splitting PDF"
            value={progress.value}
            detail={progress.label}
            onCancel={() => abort.current?.abort()}
            focusCancel
          />
        )}

        {phase === "done" && result && <SplitResult result={result} onStartOver={startOver} />}

        {phase === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              ref={splitButton}
              variant="primary"
              size="lg"
              className="w-full"
              aria-disabled={!canSplit || undefined}
              aria-describedby={hintId}
              onClick={split}
            >
              {parts && parts.length > 1 ? `Split into ${parts.length} PDFs` : "Split PDF"}
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {source.status === "checking"
                ? "Checking the file…"
                : source.status === "error"
                  ? "Choose another PDF to split."
                  : options.mode === "extract" && range.trim() === ""
                    ? "Enter the pages to extract."
                    : rangeError || everyError
                      ? "Fix the pages above."
                      : "Your file stays on this device."}
            </p>
          </div>
        )}

        {splitError && (
          <ErrorState
            title="The PDF couldn’t be split"
            description={splitError.message}
            action={
              splitError.details ? (
                <details className="text-small text-fg-muted">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-1 font-mono break-all">{splitError.details}</p>
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

function SplitResult({ result, onStartOver }: { result: Result; onStartOver: () => void }) {
  const [only] = result.files;
  const total = result.files.reduce((sum, file) => sum + file.blob.size, 0);
  if (result.files.length === 1 && only) {
    return (
      <ResultPanel
        title={`${only.name} is ready`}
        summary={[plural(only.pageCount, "page"), formatBytes(only.blob.size)]}
        primary={
          <Button variant="primary" onClick={() => downloadBlob(only.blob, only.name)}>
            <Download aria-hidden />
            Download PDF
          </Button>
        }
        secondary={
          <>
            <UseInAnotherTool outputs={[only]} />
            <Button variant="secondary" onClick={onStartOver}>
              Start over
            </Button>
          </>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ResultPanel
        title={`${plural(result.files.length, "PDF")} are ready`}
        summary={[
          `1 PDF → ${plural(result.files.length, "file")}`,
          formatBytes(result.zip?.size ?? total),
        ]}
        primary={
          result.zip && (
            <Button variant="primary" onClick={() => downloadBlob(result.zip!, result.zipName)}>
              <FileArchive aria-hidden />
              Download all (ZIP)
            </Button>
          )
        }
        secondary={
          <>
            <UseInAnotherTool outputs={result.files} />
            <Button variant="secondary" onClick={onStartOver}>
              Start over
            </Button>
          </>
        }
      />
      <ul
        aria-label="Split files"
        className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border"
      >
        {result.files.slice(0, LIST_LIMIT).map((file) => (
          <li key={file.name} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="min-w-0 truncate text-small text-fg">{file.name}</span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="text-small text-fg-muted tabular-nums">
                {plural(file.pageCount, "page")}
              </span>
              <IconButton
                label={`Download ${file.name}`}
                icon={<Download aria-hidden />}
                size="sm"
                onClick={() => downloadBlob(file.blob, file.name)}
              />
            </span>
          </li>
        ))}
      </ul>
      {result.files.length > LIST_LIMIT && (
        <p className="text-small text-fg-muted">
          The first {LIST_LIMIT} files are listed; all {result.files.length} are in the ZIP.
        </p>
      )}
    </div>
  );
}
