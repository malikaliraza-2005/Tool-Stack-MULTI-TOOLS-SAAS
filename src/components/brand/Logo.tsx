import { cn } from "@/lib/cn";
import { SITE_NAME } from "@/config/site";

/**
 * Logo mark (brand-identity.md): a K in the Lucide stroke style whose arms
 * hold the accent dot, your data, kept in place (D-15). Same geometry as
 * src/app/icon.svg and the Open Graph images.
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
      <path d="M6.5 4v16" />
      <path d="M17.5 4.5 9.25 12l8.25 7.5" />
      <circle cx="15.5" cy="12" r="2.4" className="fill-accent stroke-accent" />
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
