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
/** Pointer travel before a mouse press becomes a drag; touch drags start after a short press. */
const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 220;
/** How long dropped pages stay highlighted. */
const LANDED_MS = 700;
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
  /** Drop slot: an index among the pages not being moved. */
  to: number;
  /** Where the card was grabbed, so it doesn't jump under the pointer. */
  grabX: number;
  grabY: number;
};

/**
 * Pages of a PDF as a virtualized grid (design-system §8, tool-specifications
 * §3.3): only visible thumbnails are rendered, lazily. Select with click,
 * Ctrl/⌘-click and Shift-click, or the keyboard; rotate, delete and move the
 * selection with the toolbar, keyboard shortcuts or by dragging (a short
 * press on touch). Every change is announced.
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
    grabX: number;
    grabY: number;
  } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const ghost = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [landed, setLanded] = useState<ReadonlySet<string>>(new Set());
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
    if (drag) {
      if (event.key === "Escape") {
        event.preventDefault();
        endDrag(false);
      }
      return;
    }
    if (disabled || !focused) return;
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
  // Pointer: click to select; drag to reorder. The dragged pages lift off the
  // grid as a tilted card (a stacked deck for several) that follows the
  // pointer, the other pages slide aside to open a drop slot, and the pages
  // settle into place on release. The same on mouse, pen and touch (touch
  // lifts after a short press, so a swipe still scrolls).

  function onPointerDown(event: PointerEvent<HTMLDivElement>, id: string) {
    if (disabled || event.button !== 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    press.current = {
      x: event.clientX,
      y: event.clientY,
      id,
      pointerId: event.pointerId,
      grabX: Math.min(event.clientX - box.left, cell),
      grabY: Math.min(event.clientY - box.top, cell),
    };
    setPressed(id);
    if (event.pointerType === "touch") {
      press.current.timer = window.setTimeout(
        () => startDrag(id, event.pointerId, event.clientX, event.clientY),
        LONG_PRESS_MS,
      );
    }
  }

  function startDrag(id: string, pointerId: number, x: number, y: number) {
    const pressed = press.current;
    const ids = selected.has(id) ? targets() : [id];
    // The slot opens where the first dragged page was, so nothing jumps.
    const first = Math.min(...ids.map((page) => index.get(page) ?? 0));
    const to = pages.slice(0, first).filter((page) => !ids.includes(page.id)).length;
    pointer.current = { x, y };
    setDrag({
      ids,
      pointerId,
      to,
      grabX: pressed?.grabX ?? cell / 2,
      grabY: pressed?.grabY ?? cell / 2,
    });
    setPressed(null);
    scroller.current?.setPointerCapture?.(pointerId);
    // A short tap of haptic feedback where supported (Android).
    navigator.vibrate?.(8);
    setAnnouncement(`Moving ${describe(ids).toLowerCase()}. Release to drop, Escape to cancel.`);
  }

  /** Position of the drop slot (an index among the pages not being moved) under the pointer. */
  function slotAt(x: number, y: number): number | null {
    const element = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-rest-index],[data-drop-slot]");
    if (!element || element.dataset.dropSlot !== undefined) return null;
    const at = Number(element.dataset.restIndex);
    const box = element.getBoundingClientRect();
    return x > box.left + box.width / 2 ? at + 1 : at;
  }

  // While dragging: the card follows the pointer (set directly on the element,
  // without re-rendering the grid), and the list scrolls near its edges.
  useEffect(() => {
    if (!drag) return;
    let frame = 0;
    const tick = () => {
      const element = scroller.current;
      const card = ghost.current;
      const { x, y } = pointer.current;
      if (card) card.style.transform = `translate(${x - drag.grabX}px, ${y - drag.grabY}px)`;
      if (element) {
        const box = element.getBoundingClientRect();
        const depth =
          y < box.top + EDGE
            ? -(box.top + EDGE - y)
            : y > box.bottom - EDGE
              ? y - (box.bottom - EDGE)
              : 0;
        if (depth !== 0) {
          // Faster the closer to the edge, up to ~16 px per frame.
          element.scrollTop += Math.max(-1, Math.min(1, depth / EDGE)) * 16;
          const to = slotAt(x, y);
          if (to !== null)
            setDrag((current) => (current && current.to !== to ? { ...current, to } : current));
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [drag]);

  // Newly dropped pages pop into place, then lose the highlight.
  useEffect(() => {
    if (landed.size === 0) return;
    const timer = window.setTimeout(() => setLanded(new Set()), LANDED_MS);
    return () => window.clearTimeout(timer);
  }, [landed]);

  function onScrollerPointerMove(event: PointerEvent<HTMLDivElement>) {
    const pressing = press.current;
    if (pressing && !drag) {
      const travel = Math.hypot(event.clientX - pressing.x, event.clientY - pressing.y);
      if (event.pointerType === "touch") {
        // Movement before the press completes is a scroll: no drag.
        if (travel > DRAG_THRESHOLD && pressing.timer) {
          window.clearTimeout(pressing.timer);
          press.current = null;
          setPressed(null);
        }
        return;
      }
      if (travel > DRAG_THRESHOLD)
        startDrag(pressing.id, event.pointerId, event.clientX, event.clientY);
      return;
    }
    if (!drag) return;
    event.preventDefault();
    pointer.current = { x: event.clientX, y: event.clientY };
    const to = slotAt(event.clientX, event.clientY);
    if (to !== null && to !== drag.to) setDrag({ ...drag, to });
  }

  function endDrag(drop: boolean) {
    if (!drag) return;
    scroller.current?.releasePointerCapture?.(drag.pointerId);
    const { ids, to } = drag;
    setDrag(null);
    if (!drop) {
      setAnnouncement("Move cancelled.");
      return;
    }
    edit(
      { type: "move", ids, to },
      `${describe(ids)} moved to position ${to + 1} of ${pages.length}.`,
    );
    setLanded(new Set(ids));
  }

  function onScrollerPointerUp(event: PointerEvent<HTMLDivElement>) {
    const pressing = press.current;
    press.current = null;
    setPressed(null);
    if (pressing?.timer) window.clearTimeout(pressing.timer);
    if (drag) {
      endDrag(true);
      return;
    }
    if (!pressing) return;
    // A click: select (Ctrl/⌘ toggles, Shift extends from the anchor).
    const id = pressing.id;
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
    setPressed(null);
    endDrag(false);
  }

  // During a drag the dragged pages leave the grid and a slot takes one cell.
  const moving = new Set(drag?.ids ?? []);
  const rest = drag ? pages.filter((page) => !moving.has(page.id)) : pages;
  type Item = { kind: "page"; page: PageEntry; restIndex: number } | { kind: "slot" };
  const display: Item[] = rest.map((page, restIndex) => ({ kind: "page", page, restIndex }));
  if (drag) display.splice(Math.min(drag.to, rest.length), 0, { kind: "slot" });
  const lead = drag ? pages.find((page) => page.id === drag.ids[0]) : undefined;

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
            display
              .slice(row.index * columns, row.index * columns + columns)
              .map((item, column) => {
                const position = row.index * columns + column;
                const place = `translate(${column * (cell + GAP)}px, ${row.start}px)`;
                if (item.kind === "slot") {
                  return (
                    <div
                      key="drop-slot"
                      data-drop-slot=""
                      aria-hidden
                      className="absolute top-0 left-0 flex flex-col items-center gap-1 transition-move"
                      style={{ width: cell, height: cell + LABEL, transform: place }}
                    >
                      <div
                        className="flex items-center justify-center rounded-md border-2 border-dashed border-accent bg-accent-soft text-small text-accent-text animate-pop-in"
                        style={{ width: cell, height: cell }}
                      >
                        Drop here
                      </div>
                      <span className="text-small text-accent-text tabular-nums">
                        {position + 1}
                      </span>
                    </div>
                  );
                }
                const { page, restIndex } = item;
                const isFocused = page.id === focused && !drag;
                const isSelected = selected.has(page.id);
                return (
                  <div
                    key={page.id}
                    id={optionId(page.id)}
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`Page ${position + 1}${page.source !== position ? `, originally page ${page.source + 1}` : ""}${page.rotation ? `, rotated ${page.rotation}°` : ""}`}
                    data-rest-index={restIndex}
                    onPointerDown={(event) => onPointerDown(event, page.id)}
                    className={cn(
                      "absolute top-0 left-0 flex flex-col items-center gap-1 transition-move",
                      drag ? "cursor-grabbing" : "cursor-grab",
                      landed.has(page.id) && "animate-pop-in",
                    )}
                    style={{ width: cell, height: cell + LABEL, transform: place }}
                  >
                    <div
                      className={cn(
                        "relative flex size-full items-center justify-center overflow-hidden rounded-md border bg-surface p-1.5 transition-control",
                        isSelected ? "border-accent ring-2 ring-accent" : "border-border",
                        isFocused && "outline-2 outline-offset-2 outline-focus-ring",
                        pressed === page.id && "scale-95",
                        landed.has(page.id) && "ring-2 ring-accent",
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

      {/* The lifted card (a deck for several pages) that follows the pointer. */}
      {drag && lead && (
        <div
          ref={ghost}
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-50"
          style={{
            width: cell,
            height: cell,
            transform: `translate(${pointer.current.x - drag.grabX}px, ${pointer.current.y - drag.grabY}px)`,
          }}
        >
          {drag.ids.length > 1 && (
            <>
              <span className="absolute inset-0 translate-x-3 translate-y-3 rotate-6 rounded-md border border-border bg-surface shadow-2" />
              <span className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-3 rounded-md border border-border bg-surface shadow-2" />
            </>
          )}
          <div className="relative flex size-full -rotate-3 scale-105 items-center justify-center overflow-hidden rounded-md border-2 border-accent bg-surface p-1.5 shadow-3">
            {thumbs.get(lead.source) ? (
              // eslint-disable-next-line @next/next/no-img-element -- object URL of a rendered page, not a static asset
              <img
                src={thumbs.get(lead.source)}
                alt=""
                draggable={false}
                className="max-h-full max-w-full object-contain"
                style={{ transform: `rotate(${lead.rotation}deg)` }}
              />
            ) : (
              <Spinner aria-hidden className="text-fg-subtle" />
            )}
          </div>
          <span className="absolute -top-2.5 -right-2.5 flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-micro text-accent-fg shadow-2 tabular-nums">
            {drag.ids.length > 1 ? drag.ids.length : (index.get(lead.id) ?? 0) + 1}
          </span>
        </div>
      )}

      <p id={helpId} className="text-small text-fg-muted">
        Drag pages to rearrange them (on touch, press briefly, then drag). Click to select;
        Ctrl/⌘-click or Shift-click for several, then drag them together. Keyboard: arrows move,{" "}
        <Kbd>Space</Kbd> selects, <Kbd>Ctrl</Kbd>+arrows move pages, <Kbd>R</Kbd> rotates,{" "}
        <Kbd>Delete</Kbd> deletes, <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> undoes.
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
