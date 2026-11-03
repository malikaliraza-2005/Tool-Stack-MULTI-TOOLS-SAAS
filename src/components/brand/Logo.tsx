import { cn } from "@/lib/cn";
import { SITE_NAME } from "@/config/site";

/**
 * Logo mark (brand-identity.md): an "O" ring in the Lucide stroke style
 * holding the accent dot, your data, which stays inside (D-15). Same
 * geometry as src/app/icon.svg and the Open Graph images.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
    >
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="14.6" cy="14.6" r="2.4" className="fill-accent stroke-accent" />
    </svg>
  );
}

/** Mark + wordmark. The wordmark is live text in Geist Sans, not outlines. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark />
      <span className="text-h3 tracking-tight">{SITE_NAME}</span>
    </span>
  );
}
