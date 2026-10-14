# SEO Strategy

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: technical SEO implemented for tool pages) |
| **Status** | Technical SEO as built. On-page copy per tool (titles, FAQs) is finalized in `page-seo-specs.md` (Phase 8) |
| **Related** | [keyword-research.md](keyword-research.md) · [tool-registry.md](../04-architecture/tool-registry.md) · [architecture.md §12](../04-architecture/architecture.md#12-seo-generation) · [information-architecture.md](../02-design/information-architecture.md) |

Sprigkit wins search by being the best page for one task: a fast tool above the fold, honest privacy, and clear supporting content. Everything technical is generated from the tool registry, so every tool page gets the same correct treatment.

---

## 1. Principles

1. **One search intent per page** (mvp-scope §1). The slug, H1 and title target the main phrasing from keyword research; synonyms go in `keywords` and the content.
2. **The tool is the content.** The workspace is server-rendered at build time, so crawlers and users without JavaScript see the real tool, not a spinner.
3. **Structured data only for what is visible.** FAQPage JSON-LD mirrors the FAQs printed on the page.
4. **No invented claims.** Copy states only what the code does (content-voice-ux-copy §1). For example, "works offline" appears only once the service worker ships.

## 2. What each tool page has (as built)

| Element | Source | Implementation |
|---|---|---|
| URL | `slug` | `/<slug>`, flat, no trailing slash; one static HTML file per published tool (`generateStaticParams`, `dynamicParams = false`) |
| `<title>` | `seo.title` (≤ 65 chars, unique) | `title.absolute`, so the layout's "· Sprigkit" template is not added twice |
| Meta description | `seo.description` (70–160 chars, unique) | `generateMetadata` → `toolMetadata()` in `src/lib/seo.ts` |
| Canonical | `SITE_URL` + `/<slug>` | `alternates.canonical`; `SITE_URL` from `NEXT_PUBLIC_SITE_URL` |
| Open Graph / Twitter | title, description, URL, site name, locale | `summary_large_image` card |
| OG image | generated per tool | `app/[tool]/opengraph-image.tsx`: 1200×630 PNG at build time (brand mark, tool name, tagline, "0 bytes uploaded"); served as `image/png` via `public/_headers` |
| H1 + tagline | `seo.h1`, `tagline` | `ToolPage` |
| Breadcrumbs | category hub | Visible breadcrumbs + `BreadcrumbList` |
| JSON-LD | registry | One `@graph`: `BreadcrumbList`, `WebApplication` (free offer, `operatingSystem: "Any (web browser)"`), `FAQPage` (only when FAQs exist) |
| Supporting content | `content.tsx` | How to use, formats and limits, explanation, troubleshooting, shared "How your data stays private" section |
| FAQ | `seo.faqs` (≥ 3 for live tools) | Visible `h3` + answer pairs |
| Related tools | `related` | Only tools that are live are linked; unbuilt ones are skipped |

Validation rules for these fields (uniqueness, lengths, FAQ count) fail the build: [tool-registry.md §3](../04-architecture/tool-registry.md#3-validation-rules).

## 3. Site-level files

| File | As built |
|---|---|
| `/sitemap.xml` | `app/sitemap.ts` (force-static): the homepage and every published tool with `lastmod` = registry `updatedAt`. Pages that don't exist yet (hubs, About, Privacy) are added in their phases. `/_gallery` is never listed |
| `/robots.txt` | `app/robots.ts`: allow all (D-7) + sitemap URL. `/_gallery` is kept out of the index by its `noindex` meta tag (a Disallow would hide that tag) |
| Previews | `X-Robots-Tag: noindex` on every `*.pages.dev` host (`public/_headers`, P1-T16) |

## 4. Known gaps and owner actions

| Item | Status |
|---|---|
| Rich Results Test on a preview deployment (P3-T07) | **Not done.** Needs a pushed preview URL. Structure is checked by unit tests (`src/lib/seo.test.ts`) and E2E (`e2e/seo.spec.ts`: JSON-LD parses, FAQPage matches the visible FAQs) |
| OG image `Content-Type` on Cloudflare | Rule in `public/_headers`; verify on the first preview (fallback: render to `public/og/*.png`, architecture §3) |
| Breadcrumb and JSON-LD links to hub pages | Hubs are built in Phase 7; until then these URLs are 404. Breadcrumb links don't prefetch |
| Final titles, descriptions, FAQs | Pilot copy follows keyword-research §3; finalized in `page-seo-specs.md` (Phase 8) |
| Performance as a ranking signal | Lighthouse SEO 100 on both pilots; Performance below target (see [performance.md](../05-quality/performance.md) §2.2, R-14) |
