"use client";

import { CircleAlert, Download, Eye, ImageIcon, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes } from "@/lib/files/format";
import { KIND_LABELS } from "@/lib/image/formats";
import type { ImageEntry } from "./useImageBatch";

type ImageBatchListProps<Extra> = {
  entries: ImageEntry<Extra>[];
  /** Accessible name, e.g. "Images to compress". */
  label: string;
  selectedId?: string;
  /** Shows a "view" button per file: compare, or show its details. */
  onSelect?: (id: string) => void;
  /** e.g. "Compare" or "Show details": completed with the file name. */
  selectLabel?: string;
  onRemove: (id: string) => void;
  /** Disables removing while the batch runs. */
  busy?: boolean;
  /** The result line of a finished file, e.g. "1.2 MB → 400 KB (−67%)". */
  describeResult?: (entry: ImageEntry<Extra>) => ReactNode;
};

/**
 * The files of an image batch (P6-T03): thumbnail, name, size and status;
 * once processed, the result and its own download.
 */
export function ImageBatchList<Extra>({
  entries,
  label,
  selectedId,
  onSelect,
  selectLabel = "Show",
  onRemove,
  busy = false,
  describeResult,
}: ImageBatchListProps<Extra>) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2">
      {entries.map((entry) => {
        const selected = entry.id === selectedId;
        const selectable = onSelect && entry.status !== "error" && entry.status !== "checking";
        const size = entry.info ? `${entry.info.width} × ${entry.info.height}` : undefined;
        return (
          <li
            key={entry.id}
            className={cn(
              "flex flex-col gap-1.5 rounded-md border bg-surface p-2 pr-1",
              entry.status === "error"
                ? "border-danger"
                : selected
                  ? "border-accent"
                  : "border-border",
            )}
          >
            <div className="flex items-center gap-3">
              <Thumbnail entry={entry} />
              <div className="flex min-w-0 grow flex-col gap-0.5">
                <p className="truncate text-ui text-fg" title={entry.file.name}>
                  {entry.file.name}
                </p>
                <p className="font-mono text-small text-fg-muted tabular-nums">
                  {formatBytes(entry.file.size)}
                  {entry.info ? ` · ${KIND_LABELS[entry.info.kind]}` : ""}
                  {size ? ` · ${size}` : ""}
                </p>
                {entry.status === "done" && entry.result && describeResult && (
                  <p className="text-small text-fg tabular-nums">{describeResult(entry)}</p>
                )}
                {entry.status === "processing" && (
                  <p className="text-small text-fg-muted">Working…</p>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                {selectable && (
                  <IconButton
                    label={`${selectLabel} ${entry.file.name}`}
                    icon={<Eye aria-hidden />}
                    size="sm"
                    aria-pressed={selected}
                    onClick={() => onSelect(entry.id)}
                  />
                )}
                {entry.status === "done" && entry.result && (
                  <IconButton
                    label={`Download ${entry.result.name}`}
                    icon={<Download aria-hidden />}
                    size="sm"
                    onClick={() => downloadBlob(entry.result!.blob, entry.result!.name)}
                  />
                )}
                <IconButton
                  label={`Remove ${entry.file.name}`}
                  icon={<X aria-hidden />}
                  size="sm"
                  disabled={busy}
                  onClick={() => onRemove(entry.id)}
                />
              </div>
            </div>
            {entry.error ? (
              <Status tone="error" message={entry.error} />
            ) : entry.warning ? (
              <Status tone="warning" message={entry.warning} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Thumbnail<Extra>({ entry }: { entry: ImageEntry<Extra> }) {
  let content: ReactNode;
  if (entry.status === "checking" || entry.status === "processing") {
    content = <Spinner className="text-fg-subtle" />;
  } else if (entry.thumbnail) {
    // The user's own file on this device (blob: URL).
    // eslint-disable-next-line @next/next/no-img-element -- blob URL, no optimization possible
    content = <img src={entry.thumbnail} alt="" className="size-full object-contain" />;
  } else {
    content = <ImageIcon aria-hidden className="size-5 text-fg-subtle" />;
  }
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-checker">
      {content}
    </span>
  );
}

function Status({ tone, message }: { tone: "error" | "warning"; message: string }) {
  const Icon = tone === "error" ? CircleAlert : TriangleAlert;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 px-1 text-small",
        tone === "error" ? "text-danger" : "text-warning",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
