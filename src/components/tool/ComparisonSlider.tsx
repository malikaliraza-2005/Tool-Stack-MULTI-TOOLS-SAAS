"use client";

import { ChevronsLeftRight } from "lucide-react";
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

type Side = {
  /** Object URL of the image (the user's own file or its result: blob: URLs only). */
  src: string;
  /** "Original", "Compressed", … */
  label: string;
  /** Shown next to the label, e.g. "2.4 MB". */
  detail?: string;
};

type ComparisonSliderProps = {
  before: Side;
  after: Side;
  /** Upright size of the images, for the aspect ratio. */
  width: number;
  height: number;
  className?: string;
};

const STEP = 1;
const BIG_STEP = 10;

/**
 * Before/after comparison (design-system §8, §10.5): the "after" image is
 * revealed from the divider rightwards. Drag anywhere on the image, or focus
 * the handle and use the arrow keys (Shift for bigger steps, Home/End). The
 * divider follows the pointer directly, without animation (§7.2).
 */
export function ComparisonSlider({
  before,
  after,
  width,
  height,
  className,
}: ComparisonSliderProps) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
    handle.current?.focus({ preventScroll: true });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging.current) moveTo(event.clientX);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? BIG_STEP : STEP;
    const next: Record<string, number> = {
      ArrowLeft: position - step,
      ArrowDown: position - step,
      ArrowRight: position + step,
      ArrowUp: position + step,
      PageDown: position - BIG_STEP,
      PageUp: position + BIG_STEP,
      Home: 0,
      End: 100,
    };
    const value = next[event.key];
    if (value === undefined) return;
    event.preventDefault();
    setPosition(Math.min(100, Math.max(0, value)));
  }

  const ratio = width / height;
  const rounded = Math.round(position);

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div
        ref={frame}
        className="relative mx-auto max-w-full cursor-ew-resize touch-none overflow-hidden rounded-lg border border-border bg-checker select-none"
        style={{
          aspectRatio: `${width} / ${height}`,
          // As wide as possible, but never taller than the comparison height token.
          width: `min(100%, calc(var(--comparison-max-height) * ${ratio}))`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* The user's own images on this device (blob: URLs); never user HTML or SVG. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, no optimization possible */}
        <img
          src={before.src}
          alt={before.label}
          draggable={false}
          className="absolute inset-0 size-full object-contain"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, no optimization possible */}
        <img
          src={after.src}
          alt={after.label}
          draggable={false}
          className="absolute inset-0 size-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface shadow-2"
          style={{ left: `${position}%` }}
        />
        <div
          ref={handle}
          role="slider"
          tabIndex={0}
          aria-label={`Compare ${before.label} and ${after.label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          aria-valuetext={`${100 - rounded}% ${after.label}`}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 flex size-10 -translate-1/2 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-2 outline-none focus-visible:focus-ring"
          style={{ left: `${position}%` }}
        >
          <ChevronsLeftRight aria-hidden className="size-5" />
        </div>
        <Label side={before} className="left-2" />
        <Label side={after} className="right-2" />
      </div>
      <figcaption className="text-center text-small text-fg-muted">
        Drag the divider, or focus it and use the arrow keys, to compare.
      </figcaption>
    </figure>
  );
}

function Label({ side, className }: { side: Side; className: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-2 flex items-center gap-1.5 rounded-sm bg-surface/90 px-2 py-1 text-small text-fg shadow-1",
        className,
      )}
    >
      {side.label}
      {side.detail && <span className="font-mono text-fg-muted tabular-nums">{side.detail}</span>}
    </span>
  );
}
