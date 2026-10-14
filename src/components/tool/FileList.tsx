"use client";

import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  FileText,
  GripVertical,
  TriangleAlert,
  X,
} from "lucide-react";
import { m, useDragControls, useMotionValue, type PanInfo } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/files/format";
import { spring } from "@/lib/motion";

export type FileListItem = {
  id: string;
  name: string;
  size: number;
  /** Short type label, e.g. "PDF". */
  type: string;
  /** Extra facts after the size, e.g. "12 pages". */
  meta?: string;
  /** Object URL of a thumbnail image; a generic icon is shown without one. */
  thumbnail?: string;
  busy?: boolean;
  status?: { tone: "error" | "warning"; message: string };
};

type FileListProps = {
  items: FileListItem[];
  /** Accessible name of the list, e.g. "Files to merge, in order". */
  label: string;
  onRemove: (id: string) => void;
  /** Reordering is offered when provided: drag and move up/down buttons. */
  onReorder?: (ids: string[]) => void;
  /** Called after the last item is removed, to move focus somewhere useful. */
  onEmptied?: () => void;
};

type Span = { min: number; max: number };

/**
 * Files with name, size, type, thumbnail and remove (design-system §8).
 * Reorder by dragging the grip (pointer or touch), or with the move up/down
 * buttons (keyboard); moves are announced. Rows slide to their new place
 * with a spring layout animation (§7.2, direct manipulation).
 */
export function FileList({ items, label, onRemove, onReorder, onEmptied }: FileListProps) {
  const [announcement, setAnnouncement] = useState("");
  const layouts = useRef(new Map<string, Span>());
  const listRef = useRef<HTMLOListElement>(null);
  const pendingFocus = useRef<{ id?: string; index?: number; control: string } | null>(null);
  const order = items.map((item) => item.id);

  // Restore focus after a move or removal (buttons can disappear or disable).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const list = listRef.current;
    if (!list) return;
    if (items.length === 0) {
      onEmptied?.();
      return;
    }
    const index =
      target.id !== undefined
        ? items.findIndex((item) => item.id === target.id)
        : Math.min(target.index ?? 0, items.length - 1);
    const row = list.children[index];
    const preferred = row?.querySelector<HTMLButtonElement>(
      `[data-control="${target.control}"]:not(:disabled)`,
    );
    const fallback = row?.querySelector<HTMLButtonElement>("[data-control]:not(:disabled)");
    (preferred ?? fallback)?.focus();
  }, [items, onEmptied]);

  function move(id: string, to: number, viaKeyboard: boolean, control?: string) {
    if (!onReorder) return;
    const from = order.indexOf(id);
    if (from === -1 || to < 0 || to >= order.length || to === from) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    onReorder(next);
    if (viaKeyboard) {
      const name = items[from]?.name ?? "File";
      setAnnouncement(`${name} moved to position ${to + 1} of ${order.length}.`);
      if (control) pendingFocus.current = { id, control };
    }
  }

  // Same rule as Motion's Reorder: swap with the neighbour once the dragged
  // row's edge passes the neighbour's centre.
  function onDrag(id: string, offset: number, velocity: number) {
    if (!velocity) return;
    const index = order.indexOf(id);
    const direction = velocity > 0 ? 1 : -1;
    const neighbour = order[index + direction];
    const own = layouts.current.get(id);
    const other = neighbour ? layouts.current.get(neighbour) : undefined;
    if (!own || !other) return;
    const centre = (other.min + other.max) / 2;
    if (
      (direction === 1 && own.max + offset > centre) ||
      (direction === -1 && own.min + offset < centre)
    ) {
      move(id, index + direction, false);
    }
  }

  return (
    <>
      <ol ref={listRef} aria-label={label} className="flex flex-col gap-2">
        {items.map((item, index) => (
          <FileRow
            key={item.id}
            item={item}
            index={index}
            count={items.length}
            reorderable={Boolean(onReorder) && items.length > 1}
            onMeasure={(span) => layouts.current.set(item.id, span)}
            onDrag={(offset, velocity) => onDrag(item.id, offset, velocity)}
            onDragEnd={() =>
              setAnnouncement(
                `${item.name} is now at position ${order.indexOf(item.id) + 1} of ${order.length}.`,
              )
            }
            onMove={(to, control) => move(item.id, to, true, control)}
            onRemove={() => {
              pendingFocus.current = { index, control: "remove" };
              setAnnouncement(`${item.name} removed.`);
              onRemove(item.id);
            }}
          />
        ))}
      </ol>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

type FileRowProps = {
  item: FileListItem;
  index: number;
  count: number;
  reorderable: boolean;
  onMeasure: (span: Span) => void;
  onDrag: (offset: number, velocity: number) => void;
  onDragEnd: () => void;
  onMove: (to: number, control: string) => void;
  onRemove: () => void;
};

function FileRow({
  item,
  index,
  count,
  reorderable,
  onMeasure,
  onDrag,
  onDragEnd,
  onMove,
  onRemove,
}: FileRowProps) {
  const controls = useDragControls();
  const y = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const error = item.status?.tone === "error";

  return (
    <m.li
      layout="position"
      transition={spring}
      drag={reorderable ? "y" : false}
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin
      dragElastic={0.1}
      style={{ y }}
      onLayoutMeasure={(box) => onMeasure(box.y)}
      onDragStart={() => setDragging(true)}
      onDrag={(_event, info: PanInfo) => onDrag(y.get(), info.velocity.y)}
      onDragEnd={() => {
        setDragging(false);
        onDragEnd();
      }}
      className={cn(
        "relative flex flex-col gap-1.5 rounded-md border bg-surface p-2 pr-1",
        error ? "border-danger" : "border-border",
        dragging && "z-10 shadow-2",
      )}
    >
      <div className="flex items-center gap-3">
        {reorderable && (
          <span
            aria-hidden
            onPointerDown={(event) => controls.start(event)}
            className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-fg-subtle hover:text-fg-muted active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </span>
        )}
        <Thumbnail item={item} />
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <p className="truncate text-ui text-fg" title={item.name}>
            {item.name}
          </p>
          <p className="font-mono text-small text-fg-muted tabular-nums">
            {formatBytes(item.size)} · {item.type}
            {item.meta ? ` · ${item.meta}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {reorderable && (
            <>
              <IconButton
                label={`Move ${item.name} up`}
                icon={<ArrowUp aria-hidden />}
                size="sm"
                data-control="up"
                disabled={index === 0}
                onClick={() => onMove(index - 1, "up")}
              />
              <IconButton
                label={`Move ${item.name} down`}
                icon={<ArrowDown aria-hidden />}
                size="sm"
                data-control="down"
                disabled={index === count - 1}
                onClick={() => onMove(index + 1, "down")}
              />
            </>
          )}
          <IconButton
            label={`Remove ${item.name}`}
            icon={<X aria-hidden />}
            size="sm"
            data-control="remove"
            onClick={onRemove}
          />
        </div>
      </div>
      {/* Full width under the row, so long messages aren't squeezed on phones. */}
      {item.status && <StatusLine {...item.status} />}
    </m.li>
  );
}

function Thumbnail({ item }: { item: FileListItem }) {
  let content: ReactNode;
  if (item.busy) content = <Spinner className="text-fg-subtle" />;
  else if (item.thumbnail) {
    // Rendered from the user's own file on this device (blob: URL).
    // eslint-disable-next-line @next/next/no-img-element -- blob URL, no optimization possible
    content = <img src={item.thumbnail} alt="" className="size-full object-contain" />;
  } else content = <FileText aria-hidden className="size-5 text-fg-subtle" />;
  return (
    <span className="flex h-13 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface-2">
      {content}
    </span>
  );
}

function StatusLine({ tone, message }: { tone: "error" | "warning"; message: string }) {
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
