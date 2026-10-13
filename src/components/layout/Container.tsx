import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ContainerSize = "content" | "tool" | "wide";

// design-system §4.2: content 720px · tool 1200px · wide 1360px, with page gutters.
const sizes: Record<ContainerSize, string> = {
  content: "max-w-content",
  tool: "max-w-tool",
  wide: "max-w-wide",
};

export function Container({
  size = "wide",
  className,
  ...props
}: ComponentProps<"div"> & { size?: ContainerSize }) {
  return <div className={cn("page-container", sizes[size], className)} {...props} />;
}

/** A page section with the standard vertical rhythm (§4.4). */
export function Section({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("section-y", className)} {...props} />;
}
