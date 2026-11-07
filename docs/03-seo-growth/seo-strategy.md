# SEO Strategy

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: technical SEO implemented for tool pages) |
| **Status** | Technical SEO as built. Per-page targets, titles, outlines and FAQs: [page-seo-specs.md](page-seo-specs.md) (Phase 8) |
| **Related** | [page-seo-specs.md](page-seo-specs.md) · [keyword-research.md](keyword-research.md) · [tool-registry.md](../04-architecture/tool-registry.md) · [architecture.md §12](../04-architecture/architecture.md#12-seo-generation) · [information-architecture.md](../02-design/information-architecture.md) |

OfflineBench wins search by being the best page for one task: a fast tool above the fold, honest privacy, and clear supporting content. Everything technical is generated from the tool registry, so every tool page gets the same correct treatment.

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
| `<title>` | `seo.title` (≤ 65 chars, unique) | `title.absolute`, so the layout's "· OfflineBench" template is not added twice |
| Meta description | `seo.description` (70–160 chars, unique) | `generateMetadata` → `toolMetadata()` in `src/lib/seo.ts` |
| Canonical | `SITE_URL` + `/<slug>` | `alternates.canonical`; `SITE_URL` from `NEXT_PUBLIC_SITE_URL` |
| Open Graph / Twitter | title, description, URL, site name, locale | `summary_large_image` card |
| OG image | generated per tool, one shared image for every other page | `app/[tool]/opengraph-image.tsx`: 1200×630 PNG at build time (brand mark, tool name, tagline, "0 bytes uploaded"). `app/opengraph-image.tsx`: the same card for home, hubs, site pages and guides, set by the metadata helpers in `src/lib/seo.ts` and used as the guides' Article `image`. Served as `image/png` via `public/_headers` |
| H1 + tagline | `seo.h1`, `tagline` | `ToolPage` |
| Breadcrumbs | category hub | Visible breadcrumbs + `BreadcrumbList` |
| JSON-LD | registry | One `@graph`: `BreadcrumbList`, `WebApplication` (free offer, `operatingSystem: "Any (web browser)"`), `FAQPage` (only when FAQs exist) |
| Supporting content | `content.tsx` | How to use, formats and limits, explanation, troubleshooting, shared "How your data stays private" section |
| FAQ | `seo.faqs` (≥ 3 for live tools) | Visible `h3` + answer pairs |
| Related tools | `related` | Only tools that are live are linked; unbuilt ones are skipped |

**Category hubs (Phase 7):** title and description from `src/tools/hubs.ts` (same length limits, unique against every tool; `hubs.test.ts`), canonical, Open Graph, and JSON-LD `BreadcrumbList` + `CollectionPage` with an `ItemList` of the hub's tools (`hubMetadata`, `hubJsonLd` in `src/lib/seo.ts`).

**Site pages and guides (Phase 8):** About, Privacy, Terms and Licenses use `sitePageMetadata` + `sitePageJsonLd` (BreadcrumbList + AboutPage/WebPage); guides use `guideMetadata` (Open Graph `article`) + `guideJsonLd` (BreadcrumbList + Article). Specs: [page-seo-specs.md](page-seo-specs.md) §4.3–4.4.

**Homepage (Phase 8):** title and description from `src/components/home/home-content.ts` (same length limits, unique against every tool and hub; `seo.test.ts`), canonical, Open Graph, and JSON-LD `WebSite` + `Organization` (logo, contact email) + `FAQPage` mirroring the visible homepage FAQs (`homeMetadata`, `homeJsonLd`). No `SearchAction`: there is no search results URL.

Validation rules for these fields (uniqueness, lengths, FAQ count) fail the build: [tool-registry.md §3](../04-architecture/tool-registry.md#3-validation-rules).

## 3. Site-level files

| File | As built |
|---|---|
| `/sitemap.xml` | `app/sitemap.ts` (force-static): the homepage, the three category hubs, and every published tool with `lastmod` = registry `updatedAt`. Since Phase 8 also the site pages (About, Privacy, Terms, Licenses), the guide index and every guide with `lastmod` = its `updated` date. `/_gallery` is never listed |
| `/robots.txt` | `app/robots.ts`: allow all (D-7) + sitemap URL. `/_gallery` is kept out of the index by its `noindex` meta tag (a Disallow would hide that tag) |
| `/llms.txt` | `app/llms.txt/route.ts` (force-static, P8-T15): tools, guides and product facts in llmstxt.org format, generated from the registries. No ranking effect expected ([geo-strategy.md](geo-strategy.md) §3) |
| Previews | `X-Robots-Tag: noindex` on every `*.pages.dev` host (`public/_headers`, P1-T16) |

## 4. Known gaps and owner actions

| Item | Status |
|---|---|
| Rich Results Test on a preview deployment (P3-T07, P8-T14) | **Owner action**: needs a preview URL in a browser. Every page in the sitemap is checked automatically by `e2e/structured-data.spec.ts` (P8-T14): one JSON-LD graph, known types, Google's required properties per type, absolute same-origin URLs; plus `seo.test.ts` and the per-page E2E specs. Expected: no errors; FAQ and software-app rich results not shown (geo-strategy §3) |
| OG image `Content-Type` on Cloudflare | Rule in `public/_headers`; verify on the first preview (fallback: render to `public/og/*.png`, architecture §3) |
| Final titles, descriptions, FAQs | Reviewed for every page in [page-seo-specs.md](page-seo-specs.md) (P8-T01); changes applied in P8-T02 |
| Performance as a ranking signal | Lighthouse SEO 100 on both pilots; Performance below target (see [performance.md](../05-quality/performance.md) §2.2, R-14) |
