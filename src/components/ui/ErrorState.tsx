import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ErrorStateProps = {
  /** What happened, in plain words. */
  title: ReactNode;
  /** What the user can do about it (design-system §13). */
  description: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** A failed operation. Announced as an alert when it appears. */
export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-danger bg-danger-soft p-4 text-fg",
        className,
      )}
    >
      <CircleAlert aria-hidden className="size-5 shrink-0 text-danger" />
      <div className="flex grow flex-col gap-1">
        <p className="text-ui text-fg">{title}</p>
        <p className="text-small text-fg">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
