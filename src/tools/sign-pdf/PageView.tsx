"use client";

import { X } from "lucide-react";
import { memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { PdfPreview } from "@/lib/pdf/render";
import { cn } from "@/lib/cn";
import { clampRect, rectToView, resizeRect, viewSize, type PageBox, type Rect } from "./geometry";
import type { FormField } from "./logic";
import type { SignatureImage } from "./signature";
import { TEXT_FONT } from "./signature";
import { CHECK_PATH, CHECK_STROKE, CHECK_VIEWBOX, TEXT_LINE_HEIGHT } from "./text";

export type ItemKind = "signature" | "text" | "date" | "check";
/** A placed item; `rect` is in view points (geometry.ts). */
export type Item = {
  id: string;
  kind: ItemKind;
  page: number;
  rect: Rect;
  text?: string;
  image?: SignatureImage;
};

export const ITEM_NAMES: Record<ItemKind, string> = {
  signature: "Signature",
  text: "Text",
  date: "Date",
  check: "Checkmark",
};

/** Page images are drawn at this CSS width (2× on high-density screens). */
const RENDER_WIDTH = 900;
/** Pages this far outside the viewport keep (or start) their image. */
const KEEP_MARGIN = "1200px 0px";

type Props = {
  index: number;
  box: PageBox;
  preview: PdfPreview | null;
  fields: FormField[];
  values: Record<string, string | boolean | null>;
  activeField: string | null;
  items: Item[];
  selectedId: string | null;
  hintId: string;
  onSelect: (id: string | null) => void;
  onChange: (id: string, rect: Rect) => void;
  onDelete: (id: string) => void;
};

/** One page as an image with its form fields highlighted and items placed on it. */
export const PageView = memo(function PageView({
  index,
  box,
  preview,
  fields,
  values,
  activeField,
  items,
  selectedId,
  hintId,
  onSelect,
  onChange,
  onDelete,
}: Props) {
  const page = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  const size = viewSize(box);

  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(Boolean(entry?.isIntersecting)),
      { rootMargin: KEEP_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !preview) return;
    const abort = new AbortController();
    let objectUrl: string | null = null;
    void preview.render(index, RENDER_WIDTH, abort.signal).then((blob) => {
      if (!blob || abort.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    // Far-away pages drop their image to keep memory flat on long documents.
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [near, preview, index]);

  const widgets = fields.flatMap((field) =>
    field.widgets.flatMap((widget, widgetIndex) =>
      widget.page === index ? [{ field, widgetIndex, rect: rectToView(box, widget.rect) }] : [],
    ),
  );
  const percent = (rect: Rect) => ({
    left: `${(rect.x / size.width) * 100}%`,
    top: `${(rect.y / size.height) * 100}%`,
    width: `${(rect.width / size.width) * 100}%`,
    height: `${(rect.height / size.height) * 100}%`,
  });

  return (
    <figure className="flex flex-col gap-2">
      <div
        ref={page}
        data-page={index}
        className="light @container relative w-full overflow-hidden rounded-sm bg-surface shadow-2 select-none"
        style={{ aspectRatio: `${size.width} / ${size.height}` }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget || event.target instanceof HTMLImageElement) {
            onSelect(null);
          }
        }}
      >
        {url && (
          // A page rendered by pdf.js into a local object URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full animate-fade-in"
          />
        )}
        {widgets.map(({ field, widgetIndex, rect }) => (
          <FieldOverlay
            key={`${field.name}-${widgetIndex}`}
            field={field}
            widgetIndex={widgetIndex}
            value={values[field.name]}
            active={field.name === activeField}
            style={percent(rect)}
            fontSize={`${((rect.height * 0.62) / size.width) * 100}cqw`}
          />
        ))}
        {items.map((item) => (
          <PlacedItem
            key={item.id}
            item={item}
            pageWidth={size.width}
            pageHeight={size.height}
            pageRef={page}
            style={percent(item.rect)}
            selected={item.id === selectedId}
            hintId={hintId}
            onSelect={onSelect}
            onChange={onChange}
            onDelete={onDelete}
          />
        ))}
      </div>
      <figcaption className="text-center text-small text-fg-muted">Page {index + 1}</figcaption>
    </figure>
  );
});

function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${CHECK_VIEWBOX} ${CHECK_VIEWBOX}`} aria-hidden className={className}>
      <path d={CHECK_PATH} fill="none" stroke="currentColor" strokeWidth={CHECK_STROKE} />
    </svg>
  );
}

/** Highlights a form field's widget; shows the new value once it is changed. */
function FieldOverlay({
  field,
  widgetIndex,
  value,
  active,
  style,
  fontSize,
}: {
  field: FormField;
  widgetIndex: number;
  value: string | boolean | null | undefined;
  active: boolean;
  style: React.CSSProperties;
  fontSize: string;
}) {
  const changed = value !== undefined && value !== field.value;
  let content: React.ReactNode = null;
  if (changed) {
    if (field.kind === "checkbox") content = value === true && <CheckGlyph className="size-full" />;
    else if (field.kind === "radio") {
      content = field.options?.[widgetIndex] === value && (
        <span className="m-auto block size-1/2 rounded-full bg-fg" />
      );
    } else {
      content = (
        <span
          className="truncate px-0.5 leading-none text-fg"
          style={{ fontSize, fontFamily: TEXT_FONT }}
        >
          {String(value ?? "")}
        </span>
      );
    }
  }
  return (
    <div
      aria-hidden
      data-field-widget={field.name}
      className={cn(
        "pointer-events-none absolute flex items-center rounded-sm border transition-control",
        changed && "bg-surface",
        active ? "border-accent ring-2 ring-accent/40" : "border-accent/50",
      )}
      style={style}
    >
      {content}
    </div>
  );
}

type Drag = { mode: "move" | "resize"; x: number; y: number; rect: Rect; scale: number };

function PlacedItem({
  item,
  pageWidth,
  pageHeight,
  pageRef,
  style,
  selected,
  hintId,
  onSelect,
  onChange,
  onDelete,
}: {
  item: Item;
  pageWidth: number;
  pageHeight: number;
  pageRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  selected: boolean;
  hintId: string;
  onSelect: (id: string | null) => void;
  onChange: (id: string, rect: Rect) => void;
  onDelete: (id: string) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  const name = ITEM_NAMES[item.kind];
  const label = item.text ? `${name} “${item.text}”` : name;

  function start(event: PointerEvent<HTMLElement>, mode: Drag["mode"]) {
    if (event.button !== 0) return;
    event.stopPropagation();
    const element = pageRef.current;
    if (!element) return;
    onSelect(item.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      mode,
      x: event.clientX,
      y: event.clientY,
      rect: item.rect,
      scale: pageWidth / element.clientWidth,
    };
    setDragging(true);
  }

  function move(event: PointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = (event.clientX - state.x) * state.scale;
    const dy = (event.clientY - state.y) * state.scale;
    onChange(
      item.id,
      state.mode === "move"
        ? clampRect(
            { ...state.rect, x: state.rect.x + dx, y: state.rect.y + dy },
            pageWidth,
            pageHeight,
          )
        : resizeRect(state.rect, state.rect.width + dx, pageWidth, pageHeight),
    );
  }

  function end() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[event.key];
    if (delta) {
      event.preventDefault();
      const rect = { ...item.rect, x: item.rect.x + delta[0], y: item.rect.y + delta[1] };
      onChange(item.id, clampRect(rect, pageWidth, pageHeight));
    } else if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      const factor = event.key === "-" ? 1 / 1.1 : 1.1;
      onChange(item.id, resizeRect(item.rect, item.rect.width * factor, pageWidth, pageHeight));
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onDelete(item.id);
    } else if (event.key === "Escape" && selected) {
      event.preventDefault();
      onSelect(null);
    }
  }

  const fontSize = `${(item.rect.height / TEXT_LINE_HEIGHT / pageWidth) * 100}cqw`;

  return (
    <div
      className={cn("absolute", selected ? "z-20" : "z-10")}
      style={style}
      data-item={item.kind}
      data-item-id={item.id}
      data-rect={[item.rect.x, item.rect.y, item.rect.width, item.rect.height]
        .map((n) => n.toFixed(2))
        .join(" ")}
    >
      <button
        type="button"
        aria-label={`${label} on page ${item.page + 1}`}
        aria-describedby={hintId}
        aria-pressed={selected}
        className={cn(
          "flex size-full cursor-grab touch-none items-center rounded-sm text-fg outline-offset-2",
          selected
            ? "outline-2 outline-accent outline-dashed"
            : "hover:outline-1 hover:outline-accent/60 hover:outline-dashed",
          dragging && "cursor-grabbing",
        )}
        onPointerDown={(event) => start(event, "move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onFocus={() => onSelect(item.id)}
        onKeyDown={onKeyDown}
      >
        {item.kind === "signature" && item.image && (
          // The user's own signature as a local object URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image.url} alt="" draggable={false} className="size-full object-contain" />
        )}
        {(item.kind === "text" || item.kind === "date") && (
          <span
            className="block whitespace-pre"
            style={{ fontSize, lineHeight: TEXT_LINE_HEIGHT, fontFamily: TEXT_FONT }}
          >
            {item.text}
          </span>
        )}
        {item.kind === "check" && <CheckGlyph className="size-full" />}
      </button>
      {selected && (
        <>
          <span
            aria-hidden
            className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize touch-none rounded-full border-2 border-surface bg-accent shadow-1"
            onPointerDown={(event) => start(event, "resize")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
          <button
            type="button"
            aria-label={`Remove ${label}`}
            className="absolute -top-3 -right-3 grid size-6 cursor-pointer place-items-center rounded-full border border-border bg-surface text-fg shadow-1 hover:text-danger"
            onClick={() => onDelete(item.id)}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
