// Canonical origin for canonicals, sitemap, robots, Open Graph and JSON-LD
// (architecture §4). Set per environment in Cloudflare Pages.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "KeptLocal";

/** Public contact address on About, Privacy and Terms, and in Organization JSON-LD. */
export const CONTACT_EMAIL = "officialaliraza2005@gmail.com";
