import Link from "next/link";
import { PrivacyMeter } from "@/components/tool/PrivacyMeter";
import { cn } from "@/lib/cn";

/** Privacy proof strip (design-system §10.1): one line, the meter, how to verify. */
export function PrivacyStrip({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      aria-label="Privacy"
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-surface-2 p-4 md:flex-row md:items-center md:justify-between md:px-6",
        className,
      )}
      {...props}
    >
      <p className="max-w-prose text-body text-fg-muted">
        <span className="text-fg">Your files never leave your device.</span> Every tool runs in your
        browser, and the site’s security policy blocks the page from sending data to any server.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {/* /privacy is built in Phase 8; no prefetch until then (information-architecture §3). */}
        <PrivacyMeter href="/privacy" />
        <Link
          href="/privacy#verify"
          prefetch={false}
          className="rounded-sm text-ui text-accent-text hover:underline"
        >
          How to verify
        </Link>
      </div>
    </section>
  );
}
