"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/config/nav";
import { cn } from "@/lib/cn";

/** Category navigation; the current section is marked with the accent (§2.2). */
export function NavLinks({ links, className }: { links: readonly NavLink[]; className?: string }) {
  const pathname = usePathname();
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {links.map((link) => {
        const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 items-center rounded-md px-3 text-ui text-fg-muted transition-control hover:bg-surface-2 hover:text-fg",
                "aria-[current=page]:text-fg",
                "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent after:opacity-0 aria-[current=page]:after:opacity-100",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
