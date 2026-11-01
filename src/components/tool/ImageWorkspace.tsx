"use client";

import { Download, FileArchive, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ComparisonSlider } from "@/components/tool/ComparisonSlider";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { ImageBatchList } from "@/components/tool/ImageBatchList";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import type { ImageBatch } from "@/components/tool/useImageBatch";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { createZipBlob } from "@/lib/image/zip";
import type { ToolDefinition } from "@/tools/types";
import { UseInAnotherTool } from "./UseInAnotherTool";

type ImageWorkspaceProps = {
  batch: ImageBatch;
  meta: ToolDefinition;
  /** Limits line under the drop zone. */
  hint: string;
  /** The options panel content. */
  options: ReactNode;
  /** Primary button text for `count` ready images. */
  actionLabel: (count: number) => string;
  /** Progress bar label, e.g. "Compressing images". */
  busyLabel: string;
  onRun: () => void;
  /** "Compressed", "Resized", … (the slider's after label and the result title). */
  afterLabel: string;
  /** Extra summary parts for the result panel, after the image count. */
  summary: string[];
  zipName: string;
  /** Shown under the action button when nothing is wrong. */
  idleHint?: string;
  /** Replaces the ComparisonSlider at centre stage (e.g. the crop editor). */
  stage?: ReactNode;
  /** Lets every image be selected before processing, e.g. "Crop" to edit its crop. */
  selectLabel?: string;
};

/**
 * The image tool workspace (design-system §10.5): ComparisonSlider centre
 * stage, batch list below, options in the side panel.
 */
export function ImageWorkspace({
  batch,
  meta,
  hint,
  options,
  actionLabel,
  busyLabel,
  onRun,
  afterLabel,
  summary,
  zipName,
  idleHint = "Your images stay on this device.",
  stage,
  selectLabel,
}: ImageWorkspaceProps) {
  const dropZone = useRef<DropZoneHandle>(null);
  const wasEmpty = useRef(true);
  const hintId = useId();

  useEffect(() => {
    if (batch.entries.length === 0 && !wasEmpty.current) dropZone.current?.focus();
    wasEmpty.current = batch.entries.length === 0;
  }, [batch.entries.length]);

  if (batch.entries.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <DropZone
          ref={dropZone}
          accept={meta.input.accepts!}
          acceptLabel="images"
          onFiles={batch.addFiles}
          title="Drop images here"
          description="Or choose them from your device. Your images stay on this device."
          hint={hint}
        />
        <p role="alert" className="sr-only">
          {batch.alert}
        </p>
      </div>
    );
  }

  const busy = batch.phase === "processing";
  const canRun = batch.ready.length > 0 && !batch.checking;
  const selected = batch.selected;
  const shown = selected?.result ? selected : batch.done[0];
  // Before and after overlap only when they have the same shape (not after a crop).
  const comparable =
    shown?.result &&
    shown.info &&
    Math.abs(shown.result.width / shown.result.height - shown.info.width / shown.info.height) <
      0.01;
  const single = batch.done.length === 1 ? batch.done[0] : undefined;
  const excluded = batch.entries.filter((e) => e.status === "error").length;

  async function downloadAll() {
    downloadBlob(await createZipBlob(batch.done.map((e) => e.result!)), zipName);
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        {stage}
        {!stage && comparable && shown.result?.beforeUrl && shown.result.afterUrl && (
          <ComparisonSlider
            key={shown.id}
            before={{
              src: shown.result.beforeUrl,
              label: "Original",
              detail: formatBytes(shown.file.size),
            }}
            after={{
              src: shown.result.afterUrl,
              label: afterLabel,
              detail: formatBytes(shown.result.blob.size),
            }}
            width={shown.info!.width}
            height={shown.info!.height}
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui text-fg">
            Images{" "}
            <span className="font-mono text-fg-muted tabular-nums">({batch.entries.length})</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={batch.reset} disabled={busy}>
            <RotateCcw aria-hidden />
            Remove all
          </Button>
        </div>
        <ImageBatchList
          entries={batch.entries}
          label="Images"
          selectedId={selectLabel ? selected?.id : shown?.id}
          onSelect={selectLabel || batch.done.length > 1 ? batch.select : undefined}
          selectLabel={selectLabel ?? "Compare"}
          onRemove={batch.remove}
          busy={busy}
          describeResult={(entry) => entry.result?.note}
        />
        <DropZone
          size="sm"
          accept={meta.input.accepts!}
          acceptLabel="images"
          onFiles={batch.addFiles}
          disabled={busy}
          title="Add more images"
          description="Drop images here, or choose more from your device."
          buttonLabel="Add images"
        />
      </div>

      <aside
        aria-label={`${meta.shortName ?? meta.name} options`}
        className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-6"
      >
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
          {options}
        </fieldset>

        {busy && (
          <ProcessingState
            label={busyLabel}
            value={batch.progress.value}
            detail={batch.progress.label}
            onCancel={batch.cancel}
            focusCancel
          />
        )}

        {batch.phase === "done" && batch.done.length > 0 && (
          <ResultPanel
            title={
              single
                ? `${single.result!.name} is ready`
                : `${plural(batch.done.length, "image")} ${afterLabel.toLowerCase()}`
            }
            summary={[plural(batch.done.length, "image"), ...summary]}
            primary={
              single ? (
                <Button
                  variant="primary"
                  onClick={() => downloadBlob(single.result!.blob, single.result!.name)}
                >
                  <Download aria-hidden />
                  Download image
                </Button>
              ) : (
                <Button variant="primary" onClick={downloadAll}>
                  <FileArchive aria-hidden />
                  Download all (ZIP)
                </Button>
              )
            }
            secondary={
              <>
                <UseInAnotherTool outputs={batch.done.map((item) => item.result!)} />
                <Button variant="secondary" onClick={batch.reset}>
                  Start over
                </Button>
              </>
            }
          />
        )}

        {batch.phase === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              aria-disabled={!canRun || undefined}
              aria-describedby={hintId}
              onClick={() => canRun && onRun()}
            >
              {actionLabel(batch.ready.length)}
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {batch.checking
                ? "Checking images…"
                : batch.ready.length === 0
                  ? "Add at least one image."
                  : excluded > 0
                    ? `${plural(excluded, "image")} with problems will be left out.`
                    : idleHint}
            </p>
          </div>
        )}

        {batch.batchError && (
          <ErrorState
            title="Some images couldn’t be processed"
            description={batch.batchError.message}
          />
        )}
      </aside>

      <p role="alert" className="sr-only">
        {batch.alert}
      </p>
    </div>
  );
}

/** Total bytes before and after for a batch's finished images. */
export function batchTotals(batch: ImageBatch): { before: number; after: number } {
  return batch.done.reduce(
    (sum, e) => ({ before: sum.before + e.file.size, after: sum.after + e.result!.blob.size }),
    { before: 0, after: 0 },
  );
}
