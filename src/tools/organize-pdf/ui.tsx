"use client";

import { Download, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { PageThumbnailGrid } from "@/components/tool/PageThumbnailGrid";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";
import { notify } from "@/components/ui/Toast";
import { toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { outputFileName } from "@/lib/files/names";
import { readAsArrayBuffer } from "@/lib/files/read";
import { describeKind, sniffFile } from "@/lib/files/sniff";
// The page list model is small and has no dependencies.
import {
  applyEdit,
  createPageEditor,
  isEdited,
  outputPlan,
  redo,
  undo,
  type PageEdit,
  type PageEditorState,
} from "@/lib/pdf/page-editor";
import type { PdfPreview } from "@/lib/pdf/render";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
// Types only: pdf-lib stays in the worker chunk.
import type { OrganizeJob, OrganizeJobResult } from "./logic";
import { meta } from "./meta";

const LIMITS_HINT = "One PDF · up to 500 MB (150 MB on phones and tablets)";

type Source = {
  file: File;
  status: "checking" | "ready" | "error";
  pageCount?: number;
  error?: string;
};
type Result = { blob: Blob; name: string; pageCount: number };
type Phase = "idle" | "saving" | "done";

const createRunner = () =>
  createWorkerRunner<OrganizeJob, OrganizeJobResult>(
    () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
  );

export default function OrganizePdfUI() {
  const [source, setSource] = useState<Source | null>(null);
  const [editor, setEditor] = useState<PageEditorState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [saveError, setSaveError] = useState<ToolError | null>(null);
  const [progress, setProgress] = useState<{ value: number; label?: string }>({ value: 0 });
  const [alert, setAlert] = useState("");

  const runner = useRef<WorkerRunner<OrganizeJob, OrganizeJobResult> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const current = useRef<File | null>(null);
  const openPreview = useRef<PdfPreview | null>(null);
  const dropZone = useRef<DropZoneHandle>(null);
  const focusDropZone = useRef(false);
  const hintId = useId();

  useEffect(
    () => () => {
      runner.current?.dispose();
      void openPreview.current?.destroy();
    },
    [],
  );

  useEffect(() => {
    if (focusDropZone.current) {
      focusDropZone.current = false;
      dropZone.current?.focus();
    }
  });

  function closePreview() {
    void openPreview.current?.destroy();
    openPreview.current = null;
    setPreview(null);
  }

  async function addFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    abort.current?.abort();
    closePreview();
    current.current = file;
    setEditor(null);
    setSelected(new Set());
    setResult(null);
    setSaveError(null);
    setPhase("idle");
    const [check] = checkLimits([file], meta.limits, getDeviceClass());
    if (check?.status === "reject") {
      setSource({ file, status: "error", error: check.error.message });
      setAlert(check.error.message);
      return;
    }
    if (check?.status === "warn") notify.warning(check.message);
    setSource({ file, status: "checking" });
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
      runner.current ??= createRunner();
      const checked = await runner.current.run(
        { op: "inspect", file: { name: file.name, bytes: bytes.slice(0) } },
        { transfer: [] },
      );
      if (current.current !== file || checked.op !== "inspect") return;
      setSource({ file, status: "ready", pageCount: checked.pageCount });
      setEditor(createPageEditor(checked.pageCount));
      // Thumbnails: pdf.js loads now that the file is known to be a good PDF.
      const { openPdfPreview } = await import("@/lib/pdf/render");
      const opened = await openPdfPreview(new Uint8Array(bytes)).catch(() => null);
      if (current.current !== file) {
        void opened?.destroy();
        return;
      }
      openPreview.current = opened;
      setPreview(opened);
    } catch (error) {
      if (current.current !== file) return;
      const toolError = toToolError(error, "checking the file");
      setSource({ file, status: "error", error: toolError.message });
      setAlert(toolError.message);
    }
  }

  function startOver() {
    abort.current?.abort();
    closePreview();
    current.current = null;
    setSource(null);
    setEditor(null);
    setSelected(new Set());
    setResult(null);
    setSaveError(null);
    setPhase("idle");
    focusDropZone.current = true;
  }

  function invalidateResult() {
    setResult(null);
    setSaveError(null);
    setPhase((value) => (value === "done" ? "idle" : value));
  }

  function onEdit(change: PageEdit): string | null {
    if (!editor) return null;
    const applied = applyEdit(editor, change);
    if ("error" in applied) return applied.error;
    setEditor(applied.state);
    invalidateResult();
    return null;
  }

  async function save() {
    if (!source || !editor || phase === "saving") return;
    const controller = new AbortController();
    abort.current = controller;
    setSaveError(null);
    setProgress({ value: 0, label: "Reading the file" });
    setPhase("saving");
    try {
      const bytes = await readAsArrayBuffer(source.file);
      if (controller.signal.aborted) throw toolErrors.cancelled();
      runner.current ??= createRunner();
      const output = await runner.current.run(
        { op: "organize", file: { name: source.file.name, bytes }, plan: outputPlan(editor.pages) },
        { transfer: [bytes], signal: controller.signal, onProgress: setProgress },
      );
      if (output.op !== "organize") throw toolErrors.unknown("organizing the PDF");
      setResult({
        blob: new Blob([output.bytes], { type: "application/pdf" }),
        name: outputFileName(source.file.name, "organized", "pdf"),
        pageCount: output.pageCount,
      });
      setPhase("done");
    } catch (error) {
      const toolError = toToolError(error, "organizing the PDF");
      setPhase("idle");
      if (toolError.code === "E_CANCELLED") return;
      setSaveError(toolError);
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

  const pages = editor?.pages ?? [];
  const edited =
    editor && source.pageCount !== undefined ? isEdited(pages, source.pageCount) : false;
  const rotated = pages.filter((page) => page.rotation !== 0).length;
  const busy = phase === "saving";

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-ui text-fg">
            {source.file.name}{" "}
            <span className="font-mono text-fg-muted tabular-nums">
              ({formatBytes(source.file.size)})
            </span>
          </h2>
          <Button variant="ghost" size="sm" onClick={startOver} disabled={busy}>
            <RotateCcw aria-hidden />
            Choose another
          </Button>
        </div>

        {source.status === "checking" && (
          <p className="flex items-center gap-2 text-small text-fg-muted" role="status">
            <Spinner aria-hidden />
            Checking the file…
          </p>
        )}
        {source.status === "error" && source.error && (
          <ErrorState title="This PDF can’t be organized" description={source.error} />
        )}
        {editor && (
          <PageThumbnailGrid
            pages={pages}
            preview={preview}
            label={`Pages of ${source.file.name}`}
            selected={selected}
            onSelectionChange={setSelected}
            onEdit={onEdit}
            onUndo={() => {
              setEditor((state) => (state ? undo(state) : state));
              invalidateResult();
            }}
            onRedo={() => {
              setEditor((state) => (state ? redo(state) : state));
              invalidateResult();
            }}
            canUndo={(editor.past.length ?? 0) > 0}
            canRedo={(editor.future.length ?? 0) > 0}
            disabled={busy}
          />
        )}
      </div>

      <aside
        aria-label="Organize result"
        className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-6"
      >
        <dl className="grid grid-cols-3 gap-3 rounded-md border border-border bg-surface-2 p-3">
          {[
            { term: "Original", value: source.pageCount?.toLocaleString("en-US") ?? "–" },
            { term: "Now", value: editor ? pages.length.toLocaleString("en-US") : "–" },
            { term: "Rotated", value: editor ? rotated.toLocaleString("en-US") : "–" },
          ].map(({ term, value }) => (
            <div key={term} className="flex flex-col gap-0.5">
              <dt className="text-micro text-fg-muted uppercase">{term}</dt>
              <dd className="font-mono text-ui text-fg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {busy && (
          <ProcessingState
            label="Saving PDF"
            value={progress.value}
            detail={progress.label}
            onCancel={() => abort.current?.abort()}
            focusCancel
          />
        )}

        {phase === "done" && result && (
          <ResultPanel
            title={`${result.name} is ready`}
            summary={[plural(result.pageCount, "page"), formatBytes(result.blob.size)]}
            primary={
              <Button variant="primary" onClick={() => downloadBlob(result.blob, result.name)}>
                <Download aria-hidden />
                Download PDF
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
              variant="primary"
              size="lg"
              className="w-full"
              aria-disabled={!editor || undefined}
              aria-describedby={hintId}
              onClick={save}
            >
              Save PDF
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {source.status === "checking"
                ? "Checking the file…"
                : source.status === "error"
                  ? "Choose another PDF."
                  : edited
                    ? "Your changes are saved into a new PDF. The original isn’t changed."
                    : "Reorder, rotate or delete pages, then save."}
            </p>
          </div>
        )}

        {saveError && (
          <ErrorState
            title="The PDF couldn’t be saved"
            description={saveError.message}
            action={
              saveError.details ? (
                <details className="text-small text-fg-muted">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-1 font-mono break-all">{saveError.details}</p>
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
