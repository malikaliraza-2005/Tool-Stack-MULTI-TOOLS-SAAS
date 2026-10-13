import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  /** Always tells the user the next step (design-system §8). */
  description: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-md bg-surface-2 text-fg-muted [&_svg]:size-5">
          {icon}
        </div>
      )}
      <div className="flex max-w-prose flex-col gap-1">
        <p className="text-ui text-fg">{title}</p>
        <p className="text-small text-fg-muted">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
