import { cn } from "@/lib/cn";
import { SITE_NAME } from "@/config/site";

/**
 * Logo mark (brand-identity.md): a sprig drawn in the Lucide stroke style,
 * with the accent as the single bud. Same geometry as src/app/icon.svg.
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
      <path d="M12 21V9" />
      <path d="M12 17c-3.6 0-5.8-1.9-6.5-5.2 3.6 0 5.8 1.9 6.5 5.2Z" />
      <path d="M12 13.5c3.6 0 5.8-1.9 6.5-5.2-3.6 0-5.8 1.9-6.5 5.2Z" />
      <circle cx="12" cy="5.5" r="2.25" className="fill-accent stroke-accent" />
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
