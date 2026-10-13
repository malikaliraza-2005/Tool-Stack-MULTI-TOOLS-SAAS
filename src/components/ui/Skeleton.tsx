import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Placeholder with the final content's size, so nothing shifts when it loads. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-3 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
