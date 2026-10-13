// Site navigation (information-architecture.md). Category hubs are built in
// Phase 7 and the About/Privacy/Terms/Licenses pages in Phase 8; until then
// these links lead to the 404 page.

export type NavLink = { href: string; label: string; description?: string };

export const CATEGORY_LINKS: readonly NavLink[] = [
  { href: "/pdf-tools", label: "PDF", description: "Merge, split, organize, sign" },
  { href: "/image-tools", label: "Image", description: "Compress, convert, resize" },
  { href: "/developer-tools", label: "Developer", description: "JSON, JWT, Base64, regex" },
];

export const SITE_LINKS: readonly NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/licenses", label: "Licenses" },
];
