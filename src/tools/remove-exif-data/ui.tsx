"use client";

import { Download, FileArchive, MapPin, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import * as z from "zod/mini";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { ImageBatchList } from "@/components/tool/ImageBatchList";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { useImageBatch, type ImageEntry } from "@/components/tool/useImageBatch";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { toolErrors } from "@/lib/errors";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { readAsArrayBuffer } from "@/lib/files/read";
import { cn } from "@/lib/cn";
import { createZipBlob } from "@/lib/image/zip";
import type { MetadataReport } from "@/lib/image/report";
import { ACCEPTED, cleanedName, foundSummary, removedSummary, type Mode } from "./logic";
import { meta } from "./meta";
import { UseInAnotherTool } from "@/components/tool/UseInAnotherTool";

const optionsSchema = z.object({ mode: z.enum(["keep-orientation", "everything"]) });
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { mode: "keep-orientation" };

const LIMITS_HINT = "JPG, PNG, WebP · up to 100 MB per image, 50 images";
const ZIP_NAME = "photos-no-metadata.zip";

export default function RemoveExifDataUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const batch = useImageBatch<MetadataReport>({
    meta,
    accepted: ACCEPTED,
    inspect: async (entry, info, pool) => {
      const bytes = await readAsArrayBuffer(entry.file);
      const result = await pool.run(
        { op: "inspect-metadata", name: entry.file.name, bytes, info },
        { transfer: [bytes] },
      );
      if (result.op !== "inspect-metadata") throw toolErrors.unknown("reading the metadata");
      return result.report;
    },
  });
  const dropZone = useRef<DropZoneHandle>(null);
  const hintId = useId();
  const wasEmpty = useRef(true);

  // Back to the drop zone when the last image is removed.
  useEffect(() => {
    if (batch.entries.length === 0 && !wasEmpty.current) dropZone.current?.focus();
    wasEmpty.current = batch.entries.length === 0;
  }, [batch.entries.length]);

  const mode = options.mode as Mode;
  const busy = batch.phase === "processing";
  const canRun = batch.ready.length > 0 && !batch.checking;

  async function removeAll() {
    if (!canRun || busy) return;
    await batch.run(
      async (entry, { pool, signal, bytes }) => {
        const report = entry.extra;
        const output = await pool.run(
          { op: "remove-metadata", name: entry.file.name, bytes, info: entry.info!, mode },
          { transfer: [bytes], signal },
        );
        if (output.op !== "remove-metadata") throw toolErrors.unknown("removing the metadata");
        const blob = new Blob([output.bytes], {
          type: entry.file.type || "application/octet-stream",
        });
        return {
          blob,
          name: cleanedName(entry.file.name, entry.info!.kind),
          width: entry.info!.width,
          height: entry.info!.height,
          note: report ? removedSummary(report, mode, output.reencoded) : undefined,
        };
      },
      { action: "Cleaning" },
    );
  }

  async function downloadAll() {
    const zip = await createZipBlob(batch.done.map((entry) => entry.result!));
    downloadBlob(zip, ZIP_NAME);
  }

  if (batch.entries.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <DropZone
          ref={dropZone}
          accept={meta.input.accepts!}
          acceptLabel="images"
          onFiles={batch.addFiles}
          title="Drop photos here"
          description="Or choose them from your device. You’ll see what they contain before anything is removed."
          hint={LIMITS_HINT}
        />
        <p role="alert" className="sr-only">
          {batch.alert}
        </p>
      </div>
    );
  }

  const selected = batch.selected;
  const totalBefore = batch.done.reduce((sum, e) => sum + e.file.size, 0);
  const totalAfter = batch.done.reduce((sum, e) => sum + e.result!.blob.size, 0);
  const single = batch.done.length === 1 ? batch.done[0] : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        {selected?.extra && <ReportPanel entry={selected} report={selected.extra} />}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui text-fg">
            Photos{" "}
            <span className="font-mono text-fg-muted tabular-nums">({batch.entries.length})</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={batch.reset} disabled={busy}>
            <RotateCcw aria-hidden />
            Remove all
          </Button>
        </div>
        <ImageBatchList
          entries={batch.entries}
          label="Photos to clean"
          selectedId={selected?.id}
          onSelect={batch.select}
          selectLabel="Show metadata of"
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
          title="Add more photos"
          description="Drop photos here, or choose more from your device."
          buttonLabel="Add photos"
        />
      </div>

      <aside
        aria-label="Remove options"
        className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-6"
      >
        <fieldset className="flex flex-col gap-2" disabled={busy}>
          <legend className="mb-2 text-ui text-fg">What to remove</legend>
          <RadioGroup
            value={mode}
            onValueChange={(value) => {
              setOptions({ mode: value as Mode });
              batch.invalidate();
            }}
            aria-label="What to remove"
          >
            <Radio value="keep-orientation" label="All metadata, keep orientation (recommended)" />
            <Radio value="everything" label="Everything, including orientation" />
          </RadioGroup>
          <p className="text-small text-fg-muted">
            {mode === "keep-orientation"
              ? "Location, camera, dates and all other details are removed without touching the image. The orientation tag stays, so photos don’t appear sideways."
              : "Also removes the orientation tag. Photos taken sideways are turned upright by saving them again at high quality (JPG quality 95); the others are not changed."}
          </p>
        </fieldset>

        {busy && (
          <ProcessingState
            label="Removing metadata"
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
                : `${plural(batch.done.length, "photo")} cleaned`
            }
            summary={[
              plural(batch.done.length, "photo"),
              `${formatBytes(totalBefore)} → ${formatBytes(totalAfter)}`,
            ]}
            primary={
              single ? (
                <Button
                  variant="primary"
                  onClick={() => downloadBlob(single.result!.blob, single.result!.name)}
                >
                  <Download aria-hidden />
                  Download photo
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
              onClick={removeAll}
            >
              {batch.ready.length > 1
                ? `Remove metadata from ${batch.ready.length} photos`
                : "Remove metadata"}
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {batch.checking
                ? "Reading metadata…"
                : batch.ready.length === 0
                  ? "Add at least one JPG, PNG or WebP photo."
                  : "Your photos stay on this device."}
            </p>
          </div>
        )}

        {batch.batchError && (
          <ErrorState
            title="Some photos couldn’t be cleaned"
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

function ReportPanel({
  entry,
  report,
}: {
  entry: ImageEntry<MetadataReport>;
  report: MetadataReport;
}) {
  const titleId = useId();
  const found = foundSummary(report);
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="truncate text-h3 text-fg" title={entry.file.name}>
          {entry.status === "done" ? "Was in" : "Found in"} {entry.file.name}
        </h2>
        <p className={cn("text-small", found.location ? "text-warning" : "text-fg-muted")}>
          {found.text}
          {report.orientation !== 1 && " · has an orientation tag"}
        </p>
      </div>
      {report.groups.length === 0 ? (
        <p className="flex items-center gap-2 text-ui text-fg">
          <ShieldCheck aria-hidden className="size-5 text-success" />
          This photo has no metadata to remove.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {report.groups.map((group) => (
            <section
              key={group.id}
              aria-label={group.label}
              className={cn(
                "flex flex-col gap-2 rounded-md border p-3",
                group.id === "location"
                  ? "border-warning bg-warning-soft sm:col-span-2"
                  : "border-border bg-surface-2",
              )}
            >
              <h3 className="flex items-center gap-1.5 text-ui text-fg">
                {group.id === "location" && <MapPin aria-hidden className="size-4 text-warning" />}
                {group.label}
              </h3>
              <dl className="flex flex-col gap-1">
                {group.entries.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="flex flex-wrap gap-x-2">
                    <dt className="text-small text-fg-muted">{item.label}</dt>
                    <dd className="font-mono text-small break-all text-fg">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
