import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Keyboard hint in mono (design-system §8). */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-surface-2 px-1 font-mono text-micro text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
