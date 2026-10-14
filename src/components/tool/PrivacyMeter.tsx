import { cn } from "@/lib/cn";

/**
 * "0 bytes uploaded" readout (design-system §1, §8), styled like an
 * instrument display. The number is a guarantee, not a measurement: the CSP
 * (`connect-src 'self'`) stops the page from sending data to any other
 * server. It links to the explanation on the page.
 */
export function PrivacyMeter({
  href = "#privacy",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 shadow-1 transition-control",
        "hover:border-border-strong",
        className,
      )}
    >
      <span aria-hidden className="relative flex size-2.5 items-center justify-center">
        <span className="size-2.5 rounded-full bg-success" />
        <span className="absolute size-1 rounded-full bg-surface" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-mono text-ui text-fg tabular-nums">0 bytes uploaded</span>
        <span className="text-micro text-fg-muted group-hover:text-fg">
          Processed on this device <span aria-hidden>·</span> How it works
        </span>
      </span>
    </a>
  );
}
