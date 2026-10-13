import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { CATEGORY_LINKS, SITE_LINKS, type NavLink } from "@/config/nav";
import { SITE_NAME } from "@/config/site";
import { Container } from "./Container";

function FooterColumn({ title, links }: { title: string; links: readonly NavLink[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-micro text-fg-muted uppercase">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              className="rounded-sm text-small text-fg underline-offset-4 transition-control hover:text-accent-text hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Site footer: categories, About, Privacy, Terms, Licenses (P2-T08). */
export function Footer() {
  const categories = CATEGORY_LINKS.map((link) => ({ ...link, label: `${link.label} tools` }));
  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <p className="inline-flex items-center gap-2 text-ui text-fg">
            <LogoMark className="size-5" />
            {SITE_NAME}
          </p>
          <p className="max-w-prose text-small text-fg-muted">
            Private tools that run in your browser. Your files never leave your device.
          </p>
        </div>
        <FooterColumn title="Tools" links={categories} />
        <FooterColumn title={SITE_NAME} links={SITE_LINKS} />
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-small text-fg-muted">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </Container>
    </footer>
  );
}
