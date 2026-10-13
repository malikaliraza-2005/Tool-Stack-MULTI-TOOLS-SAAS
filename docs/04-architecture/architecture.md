# Architecture

| | |
|---|---|
| **Last updated** | 2026-10-13 |
| **Related** | [tool-registry.md](tool-registry.md) · [tool-specifications.md](tool-specifications.md) · [dependencies-licenses.md](dependencies-licenses.md) · [design-system.md](../02-design/design-system.md) |

---

## 1. Principles

1. **Static first.** The entire site is pre-rendered HTML, CSS, JS, and WASM files. No server runtime, no database, no API.
2. **Local processing.** All user data is processed in the browser. Nothing a user enters or drops is ever sent over the network.
3. **Registry-driven.** One typed tool registry generates routes, metadata, sitemap, search, hubs, and internal links.
4. **Logic separated from UI.** Every tool's processing is a pure, testable module, run in a Web Worker when heavy.
5. **Load on intent.** Heavy libraries load only when the user starts using a tool.
6. **Portable.** Output is plain static files; the host can change without code changes.
7. **Boring where possible.** No abstraction or infrastructure without a concrete need.

---

## 2. Stack **[Decision]**

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) with **static export** | `output: 'export'` |
| UI | **React 19**, **TypeScript** (strict) | |
| Styling | **Tailwind CSS 4** with design tokens | See [design-system.md](../02-design/design-system.md) §12 |
| Components | **shadcn/ui** (copied into repo) on **Radix** primitives | Restyled to tokens |
| Motion | CSS + **View Transitions API** + **Motion for React** (`LazyMotion`) | |
| Icons | **lucide-react** | |
| Fonts | **Geist Sans / Geist Mono** via `next/font` (self-hosted) | |
| Editor | **CodeMirror 6** | Developer tools only, lazy-loaded |
| Search | **Fuse.js** over a generated tool index | |
| Validation | **Zod** | Registry validation at build; option schemas |
| PWA | **Serwist** | Turbopack compatibility to be verified at scaffold (§8) |
| Unit tests | **Vitest** | |
| E2E, a11y | **Playwright** + **@axe-core/playwright** | |
| Performance | **Lighthouse CI** | |
| Hosting | **Cloudflare Pages** (Git integration) | Static asset requests free and unlimited **[Verified 2026-10-13]** |
| CI | **GitHub Actions** | Free for public repos; private repos within a monthly minutes allowance (verify) |

Exact versions and licenses: [dependencies-licenses.md](dependencies-licenses.md). Pin versions at scaffold.

---

## 3. Static export

`next.config.ts`:

```ts
const nextConfig = {
  output: "export",
  images: { unoptimized: true },   // no image optimization server in static export
  trailingSlash: false,            // /merge-pdf → out/merge-pdf.html
  reactStrictMode: true,
};
```

**Not available in static export** (do not use): middleware/proxy, Server Actions, ISR, runtime route handlers, `cookies()`/`headers()`, and `headers`/`redirects`/`rewrites` in `next.config`. Replacements:

| Need | Solution |
|---|---|
| Security headers (CSP etc.) | `public/_headers` (Cloudflare Pages) |
| Redirects | `public/_redirects` (Cloudflare Pages) |
| Images | Pre-optimized at build or authored as SVG; `<img>` with explicit width/height |
| Sitemap, robots | `app/sitemap.ts`, `app/robots.ts` with `export const dynamic = "force-static"` |
| OG images | Generated at build (`opengraph-image.tsx` with static params); if unsupported in export at scaffold time, a build script renders them to `public/og/` |

---

## 4. Site URL configuration

A single setting controls the canonical origin. Production is `https://sprigkit.com` (D-1 in [risks-and-decisions.md](../06-delivery/risks-and-decisions.md)):

```ts
// src/config/site.ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
```

Used by canonicals, sitemap, robots, Open Graph, JSON-LD. Changing domain = change one environment variable in Cloudflare + add redirects from the old host.

---

## 5. Routes

| Route | Source | Rendering |
|---|---|---|
| `/` | `app/page.tsx` | Static |
| `/[tool]` | `app/[tool]/page.tsx` + `generateStaticParams()` from registry, `dynamicParams = false` | Static, one HTML file per tool |
| `/pdf-tools`, `/image-tools`, `/developer-tools` | `app/(hubs)/<category>/page.tsx` (thin wrappers around one `CategoryHub` component) | Static |
| `/guides`, `/guides/[slug]` | `app/guides/…` | Static (after MVP content starts) |
| `/about`, `/privacy`, `/terms` | Static pages | Static |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | Static |
| 404 | `app/not-found.tsx` → `out/404.html` | Static |

Static routes take precedence over `[tool]`. The registry validator rejects slugs that collide with reserved routes (`about`, `privacy`, `terms`, `guides`, hub slugs, etc.).

---

## 6. Folder structure

```
/
├─ CLAUDE.md
├─ docs/                          # this documentation
├─ public/
│  ├─ _headers                    # CSP + security headers
│  ├─ _redirects
│  └─ og/                         # (if OG images are built by script)
├─ scripts/                       # build-time scripts (search index, license report, OG)
├─ e2e/                           # Playwright tests
└─ src/
   ├─ app/                        # routes only; thin
   │  ├─ layout.tsx
   │  ├─ page.tsx                 # homepage
   │  ├─ [tool]/page.tsx          # tool page template
   │  ├─ (hubs)/pdf-tools/page.tsx …
   │  ├─ about/ privacy/ terms/
   │  ├─ sitemap.ts  robots.ts  not-found.tsx
   ├─ components/
   │  ├─ ui/                      # shadcn/ui primitives, restyled
   │  ├─ layout/                  # header, footer, breadcrumbs, theme toggle
   │  ├─ tool/                    # ToolPage template, Workbench, DropZone, FileList,
   │  │                           # ResultPanel, PrivacyMeter, ComparisonSlider, PageThumbnailGrid
   │  └─ home/                    # hero, index, smart paste, drop suggestions
   ├─ tools/
   │  ├─ registry.ts              # imports every tool's meta; validated with Zod
   │  ├─ types.ts                 # ToolDefinition etc.
   │  └─ <slug>/                  # one folder per tool
   │     ├─ meta.ts               # registry entry (no heavy imports!)
   │     ├─ content.tsx           # supporting content (server component)
   │     ├─ ui.tsx                # client component ("use client"), lazy-loaded
   │     ├─ logic.ts              # pure processing functions
   │     ├─ logic.worker.ts       # worker entry (if heavy)
   │     └─ logic.test.ts         # unit tests
   ├─ lib/
   │  ├─ worker/                  # runInWorker helper, error types
   │  ├─ files/                   # file reading, type sniffing, download, zip
   │  ├─ detect/                  # smart-paste detectors
   │  ├─ storage.ts               # safe localStorage wrapper
   │  ├─ seo.ts                   # metadata + JSON-LD builders
   │  └─ errors.ts                # ToolError taxonomy
   ├─ config/site.ts
   └─ styles/globals.css          # tokens + Tailwind
```

**Rule:** `meta.ts` and `content.tsx` must not import processing libraries. Heavy code lives only in `ui.tsx`, `logic.ts`, and workers.

---

## 7. Rendering model

- **Server components (build time):** layout, page shell, H1, breadcrumbs, supporting content, FAQs, related tools, JSON-LD. This is the crawlable HTML.
- **Client components:** the interactive tool (`ui.tsx`), command palette, theme toggle, drop zone, smart paste.
- The tool page renders the workspace shell statically (labels, empty state, accepted formats) and **hydrates** the interactive part, so the page is meaningful before JavaScript runs and has no layout shift when it does.
- The server-rendered page includes a small client `ToolLoader` that lazy-loads the tool's `ui.tsx` (via `next/dynamic` from a client component) and swaps it into the static shell without changing its size.

---

## 8. Processing architecture

### 8.1 Web Workers
Heavy work (PDF, image codecs, hashing large files, diff/regex on large inputs, JSON > ~1 MB) runs in a module worker:

```ts
const worker = new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" });
```

A shared helper `runInWorker()` in `src/lib/worker/` provides:
- typed request/response messages,
- **transferables** for `ArrayBuffer`s (no copying large files),
- **progress** events,
- **cancellation** (`AbortSignal` → `worker.terminate()`),
- **timeout** (mandatory for regex: 1s default),
- error mapping into the `ToolError` taxonomy (see [tool-specifications.md](tool-specifications.md) §2.4).

Workers are created per job for regex (so a runaway pattern can be killed) and reused per tool session otherwise.

### 8.2 WASM and large libraries
- pdf.js worker, jSquash codecs, hash-wasm load on intent (file selected or input entered), never on page load.
- WASM files are served from our own origin (no CDNs) and cached by the service worker.
- Every deployed file < 25 MiB (Cloudflare Pages limit).
- **Spike required at scaffold:** confirm jSquash WASM loading and pdf.js worker bundling with Next 16 (Turbopack). Fallback: `next build --webpack` or copying WASM to `public/` and loading by URL.

### 8.3 Memory hygiene
- Release object URLs (`URL.revokeObjectURL`) after download.
- Process batches sequentially with a small concurrency limit (default 2).
- Check limits from the registry **before** reading large files.
- Catch allocation failures and report `E_OUT_OF_MEMORY` with guidance (fewer pages, smaller files, desktop browser).

---

## 9. State and storage

- **Tool state:** local React state per tool; no global store library. Cross-component state via context only where needed (e.g. files handed from the homepage drop zone to a tool).
- **Homepage → tool file hand-off:** files are kept in an in-memory module store during client-side navigation. If the page reloads, the user re-selects the file (nothing is persisted).
- **Preferences:** `src/lib/storage.ts` wraps `localStorage` with try/catch and Zod validation. Keys are versioned (`ts:v1:theme`, `ts:v1:favorites`, `ts:v1:recent`, `ts:v1:opts:<slug>`). **User content (files, text, tokens) is never stored.**

---

## 10. PWA and offline

- **Serwist** generates the service worker: precache app shell, fonts, and tool pages; runtime-cache lazily loaded libraries/WASM after first use.
- Navigation fallback to cached pages offline.
- Web app manifest with icons and `display: standalone`.
- Turbopack compatibility to be verified at scaffold; fallback: webpack build for production.

---

## 11. Security and privacy

### 11.1 Content-Security-Policy (`public/_headers`)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
```

Notes:
- **`connect-src 'self' blob: data:`** is the technical backbone of the "0 bytes uploaded" promise: scripts cannot send data to any other origin.
- `'unsafe-inline'` in `script-src` is required because static export cannot issue per-request nonces for Next's inline bootstrap scripts. Hardening option (later): a post-build step that hashes inline scripts and writes per-page CSP.
- `'wasm-unsafe-eval'` is required for WebAssembly codecs.
- **Analytics:** if Cloudflare Web Analytics is enabled, its exact script and beacon hosts must be added to `script-src`/`connect-src` and disclosed on the privacy page. The PrivacyMeter counts **tool data**, which never leaves the device; analytics never receives tool content.

### 11.2 Input safety
- Sniff file types by **magic bytes**, not extension alone.
- Never render user-provided SVG/HTML inline; sanitize with DOMPurify and use sandboxed iframes when previews are added (Tier 2).
- Regex runs in a terminable worker with a timeout.
- No `dangerouslySetInnerHTML` with user content.

### 11.3 Supply chain
Lockfile committed; minimal dependencies; Dependabot/Renovate PRs reviewed manually; `npm audit` and license check in CI.

---

## 12. SEO generation

All generated from the registry (see [tool-registry.md](tool-registry.md)):

- `generateMetadata()` per tool: title, description, canonical (`SITE_URL + /slug`), Open Graph, Twitter card.
- JSON-LD per tool page: `BreadcrumbList`, `WebApplication` (free, `applicationCategory`, `operatingSystem: "Any (web browser)"`), `FAQPage` only when FAQs are visible on the page.
- `sitemap.ts`: all live tools, hubs, static pages, guides; `lastModified` from registry `updatedAt`.
- `robots.ts`: allow all (D-7), sitemap URL.
- Internal links: breadcrumbs, related tools, hub listings, homepage index.

---

## 13. Testing

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest | Every `logic.ts`: normal cases, edge cases, every error code; fixtures in `src/tools/<slug>/__fixtures__/` |
| Registry | Vitest | Schema validity, unique slugs/titles/descriptions, related slugs exist, no reserved slugs |
| E2E | Playwright | Main flow per tool on Chromium, Firefox, WebKit; mobile viewport |
| **Privacy** | Playwright | Records all requests during a tool run; **fails if any request leaves the origin** (except declared analytics) |
| Accessibility | @axe-core/playwright | Every page, both themes |
| Performance | Lighthouse CI | Budgets below; fails the build when exceeded |
| Visual/motion | Manual checklist on the running site | Motion rules in design-system §7.4 |

---

## 14. Performance budgets **[Target]**

| Metric | Budget |
|---|---|
| LCP (p75) | ≤ 2.5s |
| INP (p75) | ≤ 200ms |
| CLS | ≤ 0.1 |
| Lighthouse mobile | Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100 |
| Initial JS per tool page (gzipped) | ≤ 120 KB, excluding on-intent libraries |
| Homepage initial JS (gzipped) | ≤ 100 KB |
| Fonts | ≤ 2 files preloaded |

---

## 15. CI/CD

**GitHub Actions on every push/PR:** install → typecheck → lint → unit tests → build → E2E (incl. privacy + axe) → Lighthouse CI → license check.

**Cloudflare Pages (Git integration):**
- `main` → production.
- Other branches → preview URLs.
- Build command `npm run build`, output directory `out`, `NEXT_PUBLIC_SITE_URL` set per environment.
- Previews get `X-Robots-Tag: noindex` (via `_headers` rule or environment check) so they are never indexed.

**Rollback:** promote a previous deployment in the Cloudflare dashboard (instant), then revert the commit.

---

## 16. Key decisions (ADR summary)

| # | Decision | Reason | Trade-off |
|---|---|---|---|
| A-1 | Static export, no backend | Zero cost, privacy, portability | No server fallback for heavy jobs |
| A-2 | Next.js over Astro | React ecosystem for tools, shadcn/ui, Motion; owner's choice (D-2) | More default JS than Astro; must watch budgets |
| A-3 | Cloudflare Pages | Free unlimited static requests; commercial use not restricted (re-verify before monetizing) | 25 MiB file limit; 500 builds/month |
| A-4 | Registry-driven pages | One source of truth; consistent SEO; easy to add tools | Upfront schema design |
| A-5 | Workers for heavy processing | Responsive UI, cancellation, timeouts | Bundling complexity |
| A-6 | `unsafe-inline` scripts in CSP | Required by static export | Weaker XSS protection; mitigated by no user-HTML rendering and strict `connect-src` |
| A-7 | No global state library | Tools are independent | Slight prop/context plumbing |
