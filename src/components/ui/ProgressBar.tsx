import { cn } from "@/lib/cn";

type ProgressBarProps = {
  /** Accessible name, e.g. "Merging PDFs". */
  label: string;
  /** 0–1. Omit when progress cannot be measured (indeterminate). */
  value?: number;
  /** Announced to screen readers once, when the work completes. */
  completeLabel?: string;
  /** Show the percentage next to the bar. */
  showValue?: boolean;
  className?: string;
};

/**
 * Real progress only (design-system §1 "Honest"): determinate when measurable,
 * indeterminate otherwise. The indeterminate sweep stops under reduced motion
 * and becomes a static bar.
 */
export function ProgressBar({
  label,
  value,
  completeLabel = "Done",
  showValue = false,
  className,
}: ProgressBarProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(clamped * 100);
  const complete = determinate && clamped >= 1;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-valuenow={determinate ? percent : undefined}
        className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3"
      >
        {determinate ? (
          <div
            className="h-full origin-left bg-accent transition-transform duration-(--dur-standard) ease-out"
            style={{ transform: `scaleX(${clamped})` }}
          />
        ) : (
          <div className="h-full w-2/5 rounded-full bg-accent animate-indeterminate motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50" />
        )}
      </div>
      {showValue && determinate && (
        <span
          aria-hidden
          className="w-10 text-right font-mono text-small text-fg-muted tabular-nums"
        >
          {percent}%
        </span>
      )}
      <span role="status" className="sr-only">
        {complete ? completeLabel : ""}
      </span>
    </div>
  );
}
