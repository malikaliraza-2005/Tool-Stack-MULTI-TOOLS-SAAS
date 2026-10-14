"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";

type ProcessingStateProps = {
  /** Accessible name of the progress bar, e.g. "Merging PDFs". */
  label: string;
  /** 0–1 when measurable; omit for indeterminate. */
  value?: number;
  /** What is happening now, e.g. "Adding report.pdf (2 of 3)". */
  detail?: string;
  /** Terminates the worker (tool-specifications §2.5). */
  onCancel: () => void;
  /**
   * Show only after this delay: quick operations finish without a flash of
   * progress (§2.5: shown for operations over 300 ms). Space is reserved meanwhile.
   */
  delayMs?: number;
  /** Focus Cancel when shown, when the control that started the work is gone. */
  focusCancel?: boolean;
  className?: string;
};

/** Progress and Cancel for work running in a worker (design-system §1 "Honest": real progress). */
export function ProcessingState({
  label,
  value,
  detail,
  onCancel,
  delayMs = 0,
  focusCancel = false,
  className,
}: ProcessingStateProps) {
  const [visible, setVisible] = useState(delayMs === 0);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (delayMs === 0) return;
    const id = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  useEffect(() => {
    if (visible && focusCancel) cancel.current?.focus();
  }, [visible, focusCancel]);

  return (
    <div
      className={cn("flex flex-col gap-2", !visible && "invisible", className)}
      aria-hidden={!visible || undefined}
    >
      <ProgressBar label={label} value={value} showValue={value !== undefined} />
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-small text-fg-muted tabular-nums">{detail ?? label}</p>
        <Button ref={cancel} size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
