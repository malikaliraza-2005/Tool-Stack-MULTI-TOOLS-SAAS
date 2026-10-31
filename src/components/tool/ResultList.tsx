import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/cn";

export type ResultRow = {
  label: string;
  value: string;
  /** Shown instead of `value` (e.g. a masked password); Copy still copies `value`. */
  shown?: ReactNode;
  /** A short badge after the value, e.g. "default". */
  note?: string;
  /** Show a copy button (default true). */
  copy?: boolean;
};

/**
 * Labelled values, each with its own copy button (e.g. a parsed URL or a
 * converted date). A description list: each row holds only a dt and a dd,
 * so the copy button lives inside the dd.
 */
export function ResultList({ rows, className }: { rows: ResultRow[]; className?: string }) {
  return (
    <dl
      className={cn(
        "flex flex-col divide-y divide-border rounded-md border border-border",
        className,
      )}
    >
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col px-3 py-2">
          {/* The badge sits with the label, so long values keep the full width. */}
          <dt className="flex flex-wrap items-center gap-2 text-small text-fg-muted">
            <span>{row.label}</span>
            {row.note && <Badge>{row.note}</Badge>}
          </dt>
          <dd className="flex min-h-8 items-center justify-between gap-3">
            <span className="min-w-0 font-mono text-code break-all text-fg tabular-nums">
              {row.shown ?? row.value}
            </span>
            {row.copy !== false && (
              <CopyButton
                value={row.value}
                label={`Copy ${row.label}`}
                iconOnly
                variant="ghost"
                size="sm"
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
