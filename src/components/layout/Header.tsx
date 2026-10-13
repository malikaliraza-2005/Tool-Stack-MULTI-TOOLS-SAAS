import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CATEGORY_LINKS } from "@/config/nav";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { Container } from "./Container";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

/** Site header: logo, category nav, search trigger, theme toggle (P2-T08). */
export function Header() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-border bg-bg">
      <Container className="flex h-(--header-height) items-center gap-2">
        <Link href="/" aria-label="Sprigkit home" className="-ml-1 mr-2 rounded-md px-1 py-1">
          <Logo />
        </Link>
        <nav aria-label="Categories" className="hidden md:block">
          <NavLinks links={CATEGORY_LINKS} />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <CommandPaletteTrigger />
          <ThemeToggle />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
