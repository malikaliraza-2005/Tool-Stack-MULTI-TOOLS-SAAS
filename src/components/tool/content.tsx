// Building blocks for a tool's supporting content (content.tsx in each tool):
// how to use, formats and limits, explanation, troubleshooting. Server
// components; body text 16px at a 65ch measure (design-system §3.2).

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ContentSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-24 flex-col gap-4">
      <h2 id={headingId} className="text-h2 text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Paragraph({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("max-w-prose text-body text-fg-muted", className)} {...props} />;
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex max-w-prose flex-col gap-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-body text-fg-muted">
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-small text-fg tabular-nums"
          >
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5 text-body text-fg-muted marker:text-fg-subtle">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** Term/description pairs, e.g. formats and limits. */
export function Facts({ items }: { items: { term: ReactNode; description: ReactNode }[] }) {
  return (
    <dl className="grid max-w-prose grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
      {items.map((item, index) => (
        <div key={index} className="contents">
          <dt className="text-ui text-fg">{item.term}</dt>
          <dd className="text-body text-fg-muted sm:col-span-2">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Strong(props: ComponentProps<"strong">) {
  return <strong className="font-medium text-fg" {...props} />;
}

export function Code(props: ComponentProps<"code">) {
  return (
    <code
      className="rounded-sm border border-border bg-surface-2 px-1 font-mono text-code text-fg"
      {...props}
    />
  );
}

/** A link inside body text: underlined, so it doesn't rely on colour alone (WCAG 1.4.1). */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "rounded-sm text-accent-text underline underline-offset-4 transition-control hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
