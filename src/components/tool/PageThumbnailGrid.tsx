"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/files/format";
import type { PageEdit, PageEntry } from "@/lib/pdf/page-editor";
import type { PdfPreview } from "@/lib/pdf/render";

/** Target cell width in CSS pixels; the grid fits as many columns as it can. */
const CELL_TARGET = 152;
const MIN_COLUMNS = 2;
/** Gap between cells and the label line under each thumbnail, in CSS pixels (spacing tokens 3 and 7). */
const GAP = 12;
const LABEL = 28;
/** Width thumbnails are rendered at (CSS pixels), independent of the layout, so they're cached once. */
const RENDER_WIDTH = 160;
/** Pointer travel before a mouse press becomes a drag; touch drags start after a long press. */
const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 350;
/** Distance from the scroll area's edge that scrolls it while dragging. */
const EDGE = 48;

type PageThumbnailGridProps = {
  pages: PageEntry[];
  /** Renders thumbnails; null while the document is being opened. */
  preview: PdfPreview | null;
  /** Accessible name, e.g. "Pages of report.pdf". */
  label: string;
  selected: ReadonlySet<string>;
  onSelectionChange: (selected: Set<string>) => void;
  /** Applies an edit; returns an error message when it isn't allowed. */
  onEdit: (edit: PageEdit) => string | null;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
};

type Drag = {
  ids: string[];
  pointerId: number;
  /** Insertion index in the full list (before the page at this index). */
  insert: number | null;
};

/**
 * Pages of a PDF as a virtualized grid (design-system §8, tool-specifications
 * §3.3): only visible thumbnails are rendered, lazily. Select with click,
 * Ctrl/⌘-click and Shift-click, or the keyboard; rotate, delete and move the
 * selection with the toolbar, keyboard shortcuts or by dragging (long press
 * on touch). Every change is announced.
 */
export function PageThumbnailGrid({
  pages,
  preview,
  label,
  selected,
  onSelectionChange,
  onEdit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  disabled = false,
}: PageThumbnailGridProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(pages[0]?.id ?? null);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<ReadonlyMap<number, string>>(new Map());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const press = useRef<{
    x: number;
    y: number;
    id: string;
    timer?: number;
    pointerId: number;
  } | null>(null);
  const gridId = useId();
  const helpId = useId();
  const optionId = (id: string) => `${gridId}-${id}`;

  // Columns follow the available width.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const columns = Math.max(
    MIN_COLUMNS,
    Math.floor((width + GAP) / (CELL_TARGET + GAP)) || MIN_COLUMNS,
  );
  const cell = width > 0 ? (width - GAP * (columns - 1)) / columns : CELL_TARGET;
  const rowHeight = cell + LABEL + GAP;
  const rows = Math.ceil(pages.length / columns);

  // TanStack Virtual re-renders on scroll by design; the React Compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library -- see above
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scroller.current,
    estimateSize: () => rowHeight,
    overscan: 2,
  });
  useEffect(() => virtualizer.measure(), [rowHeight, virtualizer]);

  // Thumbnails are cached by source page and released with the document (a
  // ref, because state updaters don't run once the grid has unmounted).
  const rendered = useRef(thumbs);
  useEffect(() => {
    rendered.current = thumbs;
  }, [thumbs]);
  useEffect(() => {
    return () => {
      for (const url of rendered.current.values()) URL.revokeObjectURL(url);
      rendered.current = new Map();
      setThumbs(new Map());
    };
  }, [preview]);

  const index = useMemo(() => new Map(pages.map((page, i) => [page.id, i])), [pages]);
  const focused = focusedId !== null && index.has(focusedId) ? focusedId : (pages[0]?.id ?? null);

  /** Pages an action applies to: the selection, or the focused page. */
  const targets = (): string[] => {
    if (selected.size > 0)
      return pages.filter((page) => selected.has(page.id)).map((page) => page.id);
    return focused ? [focused] : [];
  };

  function scrollToPage(id: string) {
    const position = index.get(id);
    if (position !== undefined)
      virtualizer.scrollToIndex(Math.floor(position / columns), { align: "auto" });
  }

  function describe(ids: string[]) {
    if (ids.length === 1) {
      const position = index.get(ids[0]!);
      return position !== undefined ? `Page ${position + 1}` : "Page";
    }
    return plural(ids.length, "page");
  }

  function edit(change: PageEdit, done: string) {
    const failure = onEdit(change);
    setError(failure);
    setAnnouncement(failure ?? done);
    return failure === null;
  }

  function rotate(by: 90 | -90) {
    const ids = targets();
    if (ids.length === 0) return;
    edit({ type: "rotate", ids, by }, `${describe(ids)} rotated ${by > 0 ? "right" : "left"}.`);
  }

  function remove() {
    const ids = targets();
    if (ids.length === 0) return;
    // Focus moves to the page after the removed ones (or before, at the end).
    const remaining = pages.filter((page) => !ids.includes(page.id));
    const lastIndex = Math.max(...ids.map((id) => index.get(id) ?? 0));
    const after = pages.slice(lastIndex + 1).find((page) => !ids.includes(page.id));
    if (
      edit(
        { type: "remove", ids },
        `${describe(ids)} deleted. ${plural(remaining.length, "page")} left.`,
      )
    ) {
      onSelectionChange(new Set());
      setFocusedId((after ?? remaining[remaining.length - 1])?.id ?? null);
    }
  }

  function move(step: number) {
    const ids = targets();
    if (ids.length === 0) return;
    const positions = ids.map((id) => index.get(id) ?? 0);
    const first = Math.min(...positions);
    const to = Math.max(0, Math.min(pages.length - ids.length, first + step));
    if (
      to === first &&
      ids.length === positions.length &&
      Math.max(...positions) - first === ids.length - 1
    ) {
      setAnnouncement(step < 0 ? "Already at the start." : "Already at the end.");
      return;
    }
    if (
      edit(
        { type: "move", ids, to },
        `${describe(ids)} moved to position ${to + 1} of ${pages.length}.`,
      )
    ) {
      const lead = focused && ids.includes(focused) ? focused : ids[0]!;
      requestAnimationFrame(() => scrollToPage(lead));
    }
  }

  function selectRange(fromId: string | null, toId: string, extend: boolean) {
    const from = index.get(fromId ?? toId) ?? 0;
    const to = index.get(toId) ?? 0;
    const [low, high] = from <= to ? [from, to] : [to, from];
    const range = pages.slice(low, high + 1).map((page) => page.id);
    onSelectionChange(new Set(extend ? [...selected, ...range] : range));
  }

  function focusPage(id: string) {
    setFocusedId(id);
    scrollToPage(id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || !focused || drag) return;
    const position = index.get(focused) ?? 0;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key;
    const step =
      key === "ArrowLeft"
        ? -1
        : key === "ArrowRight"
          ? 1
          : key === "ArrowUp"
            ? -columns
            : key === "ArrowDown"
              ? columns
              : 0;

    if (mod && key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) onRedo();
      else onUndo();
      setAnnouncement(event.shiftKey ? "Redone." : "Undone.");
      return;
    }
    if (mod && key.toLowerCase() === "y") {
      event.preventDefault();
      onRedo();
      setAnnouncement("Redone.");
      return;
    }
    if (mod && key.toLowerCase() === "a") {
      event.preventDefault();
      onSelectionChange(new Set(pages.map((page) => page.id)));
      setAnnouncement(`All ${plural(pages.length, "page")} selected.`);
      return;
    }
    if (step !== 0) {
      event.preventDefault();
      if (mod) {
        move(step);
        return;
      }
      const next = pages[Math.max(0, Math.min(pages.length - 1, position + step))]!;
      focusPage(next.id);
      if (event.shiftKey) selectRange(anchorId ?? focused, next.id, false);
      else setAnchorId(next.id);
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      const next = key === "Home" ? pages[0]! : pages[pages.length - 1]!;
      focusPage(next.id);
      if (event.shiftKey) selectRange(anchorId ?? focused, next.id, false);
      return;
    }
    if (key === " ") {
      event.preventDefault();
      const next = new Set(selected);
      if (next.has(focused)) next.delete(focused);
      else next.add(focused);
      onSelectionChange(next);
      setAnchorId(focused);
      setAnnouncement(
        `Page ${position + 1} ${next.has(focused) ? "selected" : "not selected"}. ${plural(next.size, "page")} selected.`,
      );
      return;
    }
    if (key === "Escape" && selected.size > 0) {
      event.preventDefault();
      onSelectionChange(new Set());
      setAnnouncement("Selection cleared.");
      return;
    }
    if (key === "Delete" || key === "Backspace") {
      event.preventDefault();
      remove();
      return;
    }
    if (key.toLowerCase() === "r" && !mod) {
      event.preventDefault();
      rotate(event.shiftKey ? -90 : 90);
    }
  }

  // ---------------------------------------------------------------------------
  // Pointer: click to select, drag to reorder (long press on touch).

  function onPointerDown(event: PointerEvent<HTMLDivElement>, id: string) {
    if (disabled || event.button !== 0) return;
    press.current = { x: event.clientX, y: event.clientY, id, pointerId: event.pointerId };
    if (event.pointerType === "touch") {
      press.current.timer = window.setTimeout(() => startDrag(id, event.pointerId), LONG_PRESS_MS);
    }
  }

  function startDrag(id: string, pointerId: number) {
    const ids = selected.has(id) ? targets() : [id];
    setDrag({ ids, pointerId, insert: null });
    scroller.current?.setPointerCapture?.(pointerId);
    setAnnouncement(`Moving ${describe(ids).toLowerCase()}.`);
  }

  function insertionAt(x: number, y: number): number | null {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-page-index]");
    if (!element) return null;
    const at = Number(element.dataset.pageIndex);
    const box = element.getBoundingClientRect();
    return x > box.left + box.width / 2 ? at + 1 : at;
  }

  function onScrollerPointerMove(event: PointerEvent<HTMLDivElement>) {
    const pressed = press.current;
    if (pressed && !drag) {
      const travel = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
      if (event.pointerType === "touch") {
        // Movement before the long press is a scroll: cancel the drag.
        if (travel > DRAG_THRESHOLD && pressed.timer) {
          window.clearTimeout(pressed.timer);
          press.current = null;
        }
        return;
      }
      if (travel > DRAG_THRESHOLD) startDrag(pressed.id, event.pointerId);
      return;
    }
    if (!drag) return;
    event.preventDefault();
    const element = scroller.current;
    if (element) {
      const box = element.getBoundingClientRect();
      if (event.clientY < box.top + EDGE) element.scrollBy({ top: -EDGE / 2 });
      else if (event.clientY > box.bottom - EDGE) element.scrollBy({ top: EDGE / 2 });
    }
    const insert = insertionAt(event.clientX, event.clientY);
    if (insert !== drag.insert) setDrag({ ...drag, insert });
  }

  function onScrollerPointerUp(event: PointerEvent<HTMLDivElement>) {
    const pressed = press.current;
    press.current = null;
    if (pressed?.timer) window.clearTimeout(pressed.timer);
    if (drag) {
      scroller.current?.releasePointerCapture?.(drag.pointerId);
      const { ids, insert } = drag;
      setDrag(null);
      if (insert === null) {
        setAnnouncement("Move cancelled.");
        return;
      }
      // The insertion index counts the moving pages; `to` counts only the others.
      const to = pages.slice(0, insert).filter((page) => !ids.includes(page.id)).length;
      edit(
        { type: "move", ids, to },
        `${describe(ids)} moved to position ${to + 1} of ${pages.length}.`,
      );
      return;
    }
    if (!pressed) return;
    // A click: select (Ctrl/⌘ toggles, Shift extends from the anchor).
    const id = pressed.id;
    setFocusedId(id);
    if (event.shiftKey) {
      selectRange(anchorId ?? focused, id, event.ctrlKey || event.metaKey);
      return;
    }
    const next = new Set(event.ctrlKey || event.metaKey ? selected : []);
    if (next.has(id) && (event.ctrlKey || event.metaKey)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
    setAnchorId(id);
    scroller.current?.focus({ preventScroll: true });
  }

  function onScrollerPointerCancel() {
    if (press.current?.timer) window.clearTimeout(press.current.timer);
    press.current = null;
    if (drag) {
      setDrag(null);
      setAnnouncement("Move cancelled.");
    }
  }

  const moving = new Set(drag?.ids ?? []);
  const actionable = selected.size > 0 || focused !== null;
  const count = selected.size;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="toolbar"
        aria-label="Page actions"
        aria-controls={gridId}
        className="flex flex-wrap items-center gap-1"
      >
        <IconButton
          label="Select all (Ctrl+A)"
          icon={<CheckSquare aria-hidden />}
          size="sm"
          disabled={disabled}
          onClick={() => {
            onSelectionChange(new Set(pages.map((page) => page.id)));
            setAnnouncement(`All ${plural(pages.length, "page")} selected.`);
          }}
        />
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <IconButton
          label="Rotate left (Shift+R)"
          icon={<RotateCcw aria-hidden />}
          size="sm"
          disabled={disabled || !actionable}
          onClick={() => rotate(-90)}
        />
        <IconButton
          label="Rotate right (R)"
          icon={<RotateCw aria-hidden />}
          size="sm"
          disabled={disabled || !actionable}
          onClick={() => rotate(90)}
        />
        <IconButton
          label="Move earlier (Ctrl+←)"
          icon={<ArrowLeft aria-hidden />}
          size="sm"
          disabled={disabled || !actionable}
          onClick={() => move(-1)}
        />
        <IconButton
          label="Move later (Ctrl+→)"
          icon={<ArrowRight aria-hidden />}
          size="sm"
          disabled={disabled || !actionable}
          onClick={() => move(1)}
        />
        <IconButton
          label="Delete (Delete)"
          icon={<Trash2 aria-hidden />}
          size="sm"
          disabled={disabled || !actionable}
          onClick={remove}
        />
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <IconButton
          label="Undo (Ctrl+Z)"
          icon={<Undo2 aria-hidden />}
          size="sm"
          disabled={disabled || !canUndo}
          onClick={onUndo}
        />
        <IconButton
          label="Redo (Ctrl+Shift+Z)"
          icon={<Redo2 aria-hidden />}
          size="sm"
          disabled={disabled || !canRedo}
          onClick={onRedo}
        />
        <span className="ml-auto text-small text-fg-muted tabular-nums">
          {count > 0 ? `${plural(count, "page")} selected` : plural(pages.length, "page")}
        </span>
      </div>

      <div
        ref={scroller}
        id={gridId}
        role="listbox"
        aria-label={label}
        aria-multiselectable="true"
        aria-describedby={helpId}
        aria-activedescendant={focused ? optionId(focused) : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={onScrollerPointerMove}
        onPointerUp={onScrollerPointerUp}
        onPointerCancel={onScrollerPointerCancel}
        className={cn(
          "relative h-120 overflow-y-auto rounded-md border border-border bg-surface-2 p-3 focus-visible:focus-ring",
          drag && "cursor-grabbing select-none",
        )}
        style={{ touchAction: drag ? "none" : "pan-y" }}
      >
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().flatMap((row) =>
            pages.slice(row.index * columns, row.index * columns + columns).map((page, column) => {
              const position = row.index * columns + column;
              const isFocused = page.id === focused;
              const isSelected = selected.has(page.id);
              const insertBefore = drag?.insert === position;
              const insertAfter = drag?.insert === position + 1 && column === columns - 1;
              return (
                <div
                  key={page.id}
                  id={optionId(page.id)}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`Page ${position + 1}${page.source !== position ? `, originally page ${page.source + 1}` : ""}${page.rotation ? `, rotated ${page.rotation}°` : ""}`}
                  data-page-index={position}
                  onPointerDown={(event) => onPointerDown(event, page.id)}
                  className={cn(
                    "absolute top-0 left-0 flex cursor-pointer flex-col items-center gap-1 transition-move",
                    moving.has(page.id) && "opacity-40",
                  )}
                  style={{
                    width: cell,
                    height: cell + LABEL,
                    transform: `translate(${column * (cell + GAP)}px, ${row.start}px)`,
                  }}
                >
                  {(insertBefore || insertAfter) && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-0 bottom-7 w-1 rounded-full bg-accent",
                        insertBefore ? "-left-2" : "-right-2",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "relative flex size-full items-center justify-center overflow-hidden rounded-md border bg-surface p-1.5 transition-control",
                      isSelected ? "border-accent ring-2 ring-accent" : "border-border",
                      isFocused && "outline-2 outline-offset-2 outline-focus-ring",
                    )}
                    style={{ height: cell, width: cell }}
                  >
                    <Thumbnail
                      source={page.source}
                      rotation={page.rotation}
                      preview={preview}
                      url={thumbs.get(page.source)}
                      onRendered={(url) =>
                        setThumbs((current) => {
                          if (current.has(page.source)) {
                            URL.revokeObjectURL(url);
                            return current;
                          }
                          return new Map(current).set(page.source, url);
                        })
                      }
                    />
                    {isSelected && (
                      <span
                        aria-hidden
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-accent text-micro text-accent-fg"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-small text-fg tabular-nums">
                    {position + 1}
                    {page.rotation !== 0 && (
                      <span className="text-fg-muted"> · {page.rotation}°</span>
                    )}
                  </span>
                </div>
              );
            }),
          )}
        </div>
      </div>

      <p id={helpId} className="text-small text-fg-muted">
        Click to select, Ctrl/⌘-click or Shift-click for several; drag to move (on touch, press and
        hold). Keyboard: arrows move, <Kbd>Space</Kbd> selects, <Kbd>Ctrl</Kbd>+arrows move pages,{" "}
        <Kbd>R</Kbd> rotates, <Kbd>Delete</Kbd> deletes, <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> undoes.
      </p>
      {error && (
        <p className="text-small text-danger" role="alert">
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function Thumbnail({
  source,
  rotation,
  preview,
  url,
  onRendered,
}: {
  source: number;
  rotation: number;
  preview: PdfPreview | null;
  url: string | undefined;
  onRendered: (url: string) => void;
}) {
  // Rendered when the page first scrolls into view; cancelled if it scrolls away first.
  useEffect(() => {
    if (url || !preview) return;
    const controller = new AbortController();
    void preview.render(source, RENDER_WIDTH, controller.signal).then((blob) => {
      if (blob && !controller.signal.aborted) onRendered(URL.createObjectURL(blob));
    });
    return () => controller.abort();
    // onRendered is a fresh closure each render; the request depends on these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, preview, source]);

  if (!url) return <Spinner aria-hidden className="text-fg-subtle" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- object URL of a rendered page, not a static asset
    <img
      src={url}
      alt=""
      draggable={false}
      className="max-h-full max-w-full object-contain shadow-1 transition-move"
      style={{ transform: `rotate(${rotation}deg)` }}
    />
  );
}
