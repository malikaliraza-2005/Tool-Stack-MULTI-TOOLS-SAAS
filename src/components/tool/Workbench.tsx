import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Developer-tool layout (design-system §10.3): a toolbar on top (mode switch,
 * options), then input and output panes side by side from `lg`, stacked
 * below. Each pane has a title, actions and an optional status line.
 */
export function Workbench({
  toolbar,
  children,
  footer,
}: {
  toolbar: ReactNode;
  /** Two WorkbenchPane elements: input, then output. */
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border p-3 md:px-4">
        {toolbar}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border [&>*+*]:border-t [&>*+*]:border-border lg:[&>*+*]:border-t-0">
        {children}
      </div>
      {footer && (
        <div className="flex flex-col gap-3 border-t border-border p-3 md:px-4">{footer}</div>
      )}
    </div>
  );
}

export function WorkbenchPane({
  title,
  actions,
  status,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  /** One line under the pane: validity, sizes, progress. */
  status?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5 md:px-4">
        <h2 id={titleId} className="text-ui text-fg">
          {title}
        </h2>
        {actions && <div className="flex flex-wrap items-center gap-1">{actions}</div>}
      </div>
      <div className="h-80 min-h-0 overflow-hidden lg:h-120">{children}</div>
      <div className="flex min-h-10 items-center gap-2 border-t border-border px-3 py-2 text-small text-fg-muted md:px-4">
        {status}
      </div>
    </section>
  );
}

/** A labelled group of toolbar controls. */
export function ToolbarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}
