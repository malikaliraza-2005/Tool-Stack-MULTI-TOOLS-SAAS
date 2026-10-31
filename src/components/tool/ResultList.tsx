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
          <dt className="text-small text-fg-muted">{row.label}</dt>
          <dd className="flex min-h-8 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 font-mono text-code break-all text-fg tabular-nums">
              {row.shown ?? row.value}
              {row.note && <Badge>{row.note}</Badge>}
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
