"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { constrainCrop, cropPixels, type Aspect, type NormalizedRect } from "./logic";

type Handle = "move" | "nw" | "ne" | "sw" | "se";

type CropperProps = {
  /** The user's own image (blob: URL). */
  src: string;
  /** Upright size of the image. */
  width: number;
  height: number;
  aspect: Aspect;
  value: NormalizedRect;
  onChange: (rect: NormalizedRect) => void;
};

const STEP = 0.01;
const BIG_STEP = 0.1;
const HANDLES: Exclude<Handle, "move">[] = ["nw", "ne", "sw", "se"];

/**
 * Crop area editor (tool-specifications §4.3). Drag inside the area to move
 * it and its corners to resize it. Keyboard: focus the area, arrow keys move
 * it, Shift + arrow keys resize it (Alt for bigger steps). The rectangle
 * follows the pointer directly, without animation (design-system §7.2).
 */
export function Cropper({ src, width, height, aspect, value, onChange }: CropperProps) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; x: number; y: number; start: NormalizedRect } | null>(null);
  const helpId = useId();
  const size = { width, height };
  const px = cropPixels(value, size);

  function resized(start: NormalizedRect, handle: Exclude<Handle, "move">, dx: number, dy: number) {
    const left = handle === "nw" || handle === "sw";
    const top = handle === "nw" || handle === "ne";
    const right = start.x + start.width;
    const bottom = start.y + start.height;
    const next = constrainCrop(
      {
        x: start.x,
        y: start.y,
        width: start.width + (left ? -dx : dx),
        height: start.height + (top ? -dy : dy),
      },
      size,
      aspect,
    );
    // Keep the opposite corner where it was.
    return constrainCrop(
      {
        ...next,
        x: left ? right - next.width : start.x,
        y: top ? bottom - next.height : start.y,
      },
      size,
      aspect,
    );
  }

  function onPointerDown(event: PointerEvent<HTMLElement>, handle: Handle) {
    if (event.button !== 0) return;
    event.stopPropagation();
    drag.current = { handle, x: event.clientX, y: event.clientY, start: value };
    frame.current?.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const box = frame.current?.getBoundingClientRect();
    if (!current || !box || box.width === 0) return;
    const dx = (event.clientX - current.x) / box.width;
    const dy = (event.clientY - current.y) / box.height;
    const { start, handle } = current;
    onChange(
      handle === "move"
        ? constrainCrop({ ...start, x: start.x + dx, y: start.y + dy }, size, aspect)
        : resized(start, handle, dx, dy),
    );
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (frame.current?.hasPointerCapture(event.pointerId)) {
      frame.current.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.altKey ? BIG_STEP : STEP;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = delta[event.key];
    if (!d) return;
    event.preventDefault();
    onChange(
      event.shiftKey
        ? resized(value, "se", d[0], d[1])
        : constrainCrop({ ...value, x: value.x + d[0], y: value.y + d[1] }, size, aspect),
    );
  }

  const pct = (n: number) => `${n * 100}%`;

  return (
    <figure className="flex flex-col gap-2">
      <div
        ref={frame}
        className="relative mx-auto max-w-full touch-none overflow-hidden rounded-lg border border-border bg-checker select-none"
        style={{
          aspectRatio: `${width} / ${height}`,
          width: `min(100%, calc(var(--comparison-max-height) * ${width / height}))`,
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* The user's own image on this device (blob: URL); never user HTML or SVG. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, no optimization possible */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-contain"
        />
        {/* Dimmed area outside the crop. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 bg-overlay" style={{ height: pct(value.y) }} />
          <div
            className="absolute inset-x-0 bottom-0 bg-overlay"
            style={{ height: pct(1 - value.y - value.height) }}
          />
          <div
            className="absolute left-0 bg-overlay"
            style={{ top: pct(value.y), height: pct(value.height), width: pct(value.x) }}
          />
          <div
            className="absolute right-0 bg-overlay"
            style={{
              top: pct(value.y),
              height: pct(value.height),
              width: pct(1 - value.x - value.width),
            }}
          />
        </div>
        <div
          role="group"
          tabIndex={0}
          aria-label={`Crop area, ${px.width} × ${px.height} pixels at ${px.x}, ${px.y}`}
          aria-describedby={helpId}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => onPointerDown(event, "move")}
          className="absolute cursor-move border-2 border-surface shadow-2 outline-none focus-visible:focus-ring"
          style={{
            left: pct(value.x),
            top: pct(value.y),
            width: pct(value.width),
            height: pct(value.height),
          }}
        >
          {HANDLES.map((handle) => (
            <span
              key={handle}
              aria-hidden
              onPointerDown={(event) => onPointerDown(event, handle)}
              className={cn(
                "absolute size-5 rounded-full border-2 border-accent bg-surface shadow-1",
                handle === "nw" && "-top-2.5 -left-2.5 cursor-nwse-resize",
                handle === "ne" && "-top-2.5 -right-2.5 cursor-nesw-resize",
                handle === "sw" && "-bottom-2.5 -left-2.5 cursor-nesw-resize",
                handle === "se" && "-right-2.5 -bottom-2.5 cursor-nwse-resize",
              )}
            />
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-small text-fg-muted">
        <span id={helpId}>
          Drag the area or its corners. Keyboard: arrow keys move it, Shift + arrow keys resize it,
          add Alt for bigger steps.
        </span>
        <span aria-live="polite" className="font-mono text-fg tabular-nums">
          {px.width} × {px.height}
        </span>
      </figcaption>
    </figure>
  );
}
