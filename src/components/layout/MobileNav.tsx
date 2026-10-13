"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { CATEGORY_LINKS, SITE_LINKS } from "@/config/nav";
import { cn } from "@/lib/cn";

const linkClasses = cn(
  "flex min-h-11 flex-col justify-center rounded-md px-3 py-2 transition-control hover:bg-surface-2",
  "aria-[current=page]:bg-accent-soft",
);

/** Navigation sheet below `md`, where the header has no room for the category links. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton label="Menu" icon={<Menu aria-hidden />} className="md:hidden" />
      </DialogTrigger>
      <SheetContent title="Menu">
        <nav aria-label="Mobile" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="px-3 text-micro text-fg-muted uppercase">Tools</p>
            {CATEGORY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                onClick={close}
                aria-current={pathname === link.href ? "page" : undefined}
                className={linkClasses}
              >
                <span className="text-ui text-fg">{link.label} tools</span>
                <span className="text-small text-fg-muted">{link.description}</span>
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <p className="px-3 text-micro text-fg-muted uppercase">Sprigkit</p>
            {SITE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                onClick={close}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(linkClasses, "text-ui text-fg")}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Dialog>
  );
}
