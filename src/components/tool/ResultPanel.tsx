"use client";

import { CircleCheck } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { duration, ease } from "@/lib/motion";

type ResultPanelProps = {
  /** What was produced, e.g. "merged.pdf is ready". */
  title: string;
  /** Numeric summary parts, joined with " · ": ["3 files → 1 PDF", "12 pages", "4.2 MB"]. */
  summary: string[];
  /** Download or Copy. */
  primary: ReactNode;
  /** Reset, "Use in another tool", … */
  secondary?: ReactNode;
  /**
   * Moves focus to the title when the panel appears, so keyboard and screen
   * reader users land on the result (the action that produced it is gone).
   */
  focusOnMount?: boolean;
  className?: string;
};

/**
 * Result of a tool run (design-system §8): numbers first, then actions. It
 * enters with a short fade and rise (§7.3); with reduced motion, a quick fade.
 */
export function ResultPanel({
  title,
  summary,
  primary,
  secondary,
  focusOnMount = true,
  className,
}: ResultPanelProps) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);

  return (
    <m.section
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? duration.instant : duration.standard, ease: ease.out }}
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            ref={heading}
            id={titleId}
            tabIndex={-1}
            className="text-h3 break-words text-fg outline-none focus-visible:focus-ring"
          >
            {title}
          </h2>
          <p className="font-mono text-small text-fg-muted tabular-nums">
            {/* Separators sit outside the nowrap spans so the line can wrap between parts. */}
            {summary.map((part, index) => (
              <Fragment key={index}>
                {index > 0 && " · "}
                <span className="whitespace-nowrap">{part}</span>
              </Fragment>
            ))}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {primary}
        {secondary}
      </div>
    </m.section>
  );
}
