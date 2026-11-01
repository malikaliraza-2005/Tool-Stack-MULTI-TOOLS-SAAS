# Architecture

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: tool platform as built) |
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
| Framework | **Next.js 16** (App Router) with **static export** | `output: 'export'`. Built with **webpack** (`--webpack`), not Turbopack (D-14, §8.4) |
| UI | **React 19**, **TypeScript** (strict) | |
| Styling | **Tailwind CSS 4** with design tokens | Via `@tailwindcss/postcss`. See [design-system.md](../02-design/design-system.md) §12 |
| Components | **shadcn/ui** (copied into repo) on **Radix** primitives | Restyled to tokens |
| Motion | CSS + **View Transitions API** + **Motion for React** (`LazyMotion`) | |
| Icons | **lucide-react** | |
| Fonts | **Geist Sans / Geist Mono** via `next/font` (self-hosted) | |
| Editor | **CodeMirror 6** | Developer tools only, lazy-loaded |
| Search | **Fuse.js** over a generated tool index | |
| Validation | **Zod** | Registry validation at build; option schemas |
| PWA | **Serwist** (`@serwist/turbopack` route-handler integration; works with webpack builds) | Verified in Phase 1 (§10) |
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
  poweredByHeader: false,
};
```

`npm run build` runs `next build --webpack`; `npm run dev` runs `next dev --webpack` (D-14).

**Not available in static export** (do not use): middleware/proxy, Server Actions, ISR, runtime route handlers, `cookies()`/`headers()`, and `headers`/`redirects`/`rewrites` in `next.config`. Replacements:

| Need | Solution |
|---|---|
| Security headers (CSP etc.) | `public/_headers` (Cloudflare Pages) |
| Redirects | `public/_redirects` (Cloudflare Pages) |
| Images | Pre-optimized at build or authored as SVG; `<img>` with explicit width/height |
| Sitemap, robots | `app/sitemap.ts`, `app/robots.ts` with `export const dynamic = "force-static"` |
| OG images | Generated at build (`opengraph-image.tsx` with static params). **Works** (P1-T23). Files are emitted without an extension, so `_headers` sets `Content-Type: image/png` (§8.4). Fallback if Cloudflare ignores that header: a build script renders them to `public/og/*.png` |

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
| `/about`, `/privacy`, `/terms`, `/licenses` | Static pages (Phase 8) | Static |
| `/_gallery` | `app/%5Fgallery/page.tsx`: component gallery for design review. `noindex, nofollow`, not linked, excluded from the sitemap | Static |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | Static |
| 404 | `app/not-found.tsx` → `out/404.html` | Static |

Static routes take precedence over `[tool]`. The registry validator rejects slugs that collide with reserved routes (`about`, `privacy`, `terms`, `licenses`, `guides`, `_gallery`, hub slugs, etc.).

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
   │  ├─ about/ privacy/ terms/ licenses/
   │  ├─ %5Fgallery/page.tsx      # /_gallery component gallery (noindex, unlinked; `%5F` = literal "_")
   │  ├─ template.tsx             # page transition (<ViewTransition>)
   │  ├─ icon.svg  apple-icon.png  favicon.ico
   │  ├─ sitemap.ts  robots.ts  not-found.tsx
   ├─ components/
   │  ├─ ui/                      # Radix-based primitives, restyled with tokens
   │  ├─ layout/                  # header, footer, breadcrumbs, theme toggle, command palette, Container
   │  ├─ brand/                   # Logo, LogoMark
   │  ├─ motion/                  # MotionProvider (LazyMotion + MotionConfig)
   │  ├─ gallery/                 # component gallery (dev review only)
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
   │     ├─ logic.test.ts         # unit tests
   │     └─ __fixtures__/         # generated test fixtures (shared with e2e/)
   │  ├─ content.ts               # slug → supporting content component
   │  ├─ schema.ts  validate.ts   # Zod schema and registry rules (build time)
   ├─ lib/
   │  ├─ worker/                  # runInWorker helper, error types
   │  ├─ files/                   # file reading, type sniffing, download, zip
   │  ├─ detect/                  # smart-paste detectors
   │  ├─ pdf/                     # pdf.js thumbnails (on intent)
   │  ├─ og.ts                    # token colors as sRGB for OG images
   │  ├─ storage.ts               # safe localStorage wrapper
   │  ├─ theme.ts                 # theme preference + pre-paint script
   │  ├─ motion.ts                # motion tokens for Motion for React
   │  ├─ cn.ts                    # class name join
   │  ├─ seo.ts                   # metadata + JSON-LD builders
   │  └─ errors.ts                # ToolError taxonomy
   ├─ config/site.ts  config/nav.ts
   └─ styles/globals.css          # tokens + Tailwind
```

**Rule:** `meta.ts` and `content.tsx` must not import processing libraries. Heavy code lives only in `ui.tsx`, `logic.ts`, and workers.

---

## 7. Rendering model

- **Server components (build time):** layout, page shell, H1, breadcrumbs, supporting content, FAQs, related tools, JSON-LD. This is the crawlable HTML.
- **Client components:** the interactive tool (`ui.tsx`), command palette, theme toggle, drop zone, smart paste.
- The tool page renders the workspace shell statically (labels, empty state, accepted formats) and **hydrates** the interactive part, so the page is meaningful before JavaScript runs and has no layout shift when it does.
- The server-rendered page includes a small client `ToolLoader` that lazy-loads the tool's `ui.tsx` (via `next/dynamic` from a client component) and swaps it into the static shell without changing its size.
- *As built (Phase 3):* `ToolLoader` keeps `next/dynamic`'s server rendering on, so each tool UI is its own chunk **and** is pre-rendered at build time: the static HTML contains the real empty workspace (drop zone with its "Choose files" button, editors as plain text areas) and hydration changes nothing visible (CLS 0–0.003 in Lighthouse). Libraries inside the UI load on intent: CodeMirror on hover/focus/content, the JSON parser on first input, pdf.js on the first added PDF, pdf-lib only in the worker.

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
- jSquash WASM loading and pdf.js worker bundling were proven in Phase 1 with webpack builds (§8.4).
- **HEIC decoder (Phase 6, D-6):** `scripts/copy-libheif-assets.mjs` (run by `predev`/`prebuild` after the pdf.js copy) copies the unmodified `libheif-js` WASM build, its license texts and the committed source tarballs (`vendor-src/`) to `public/vendor/libheif-js-<version>/` (git-ignored). `src/lib/image/heic.ts` imports `libheif-bundle.mjs` from there at run time with `/* webpackIgnore: true */`, so it never enters a Sprigkit chunk; a unit test keeps `LIBHEIF_VERSION` equal to the installed package.
- pdf.js 6 loads optional WASM decoders (JPX/ICC), CMaps and standard fonts by URL. **Implemented in Phase 3:** `scripts/copy-pdfjs-assets.mjs` (run by `predev`/`prebuild`) copies `wasm/` (without the unused QuickJS engine), `cmaps/`, `standard_fonts/` and `iccs/` to `public/vendor/pdfjs-<version>/` (git-ignored); `src/lib/pdf/render.ts` (thumbnails and page previews, since Phase 5) passes `wasmUrl`, `cMapUrl`, `standardFontDataUrl` and `iccUrl`, and a unit test keeps its version equal to the installed package. Never use CDN defaults.

### 8.3 Memory hygiene
- Release object URLs (`URL.revokeObjectURL`) after download (`downloadBlob` revokes after 10 s, because Safari and Firefox can fail when it happens synchronously) and when thumbnails are removed.
- Never put large text in an unvirtualized element: 20 MB of formatted JSON in a `<textarea>` blocked the main thread for 30–45 s (layout), while CodeMirror's virtualized view handles it in about 1.2 s (Phase 3).
- Process batches sequentially with a small concurrency limit (default 2).
- Check limits from the registry **before** reading large files (`checkLimits` in `src/lib/files/limits.ts`; `limits.per` says per file or total).
- Catch allocation failures and report `E_OUT_OF_MEMORY` with guidance (fewer pages, smaller files, desktop browser).


### 8.4 Phase 1 spike results

Spikes ran as throwaway pages on the local `spikes` branch (commit `P1-T19..T25`, not merged). Each spike has a Playwright test that runs it on the **production build**, served with the real `_headers` CSP, with the no-network and CSP-violation fixtures active, in Chromium, Firefox, WebKit and a mobile viewport. Verified 2026-10-13 with Next.js 16.4.0.

| Task | Spike | Result | Approach / notes |
|---|---|---|---|
| P1-T19 | jSquash WASM (JPEG + WebP encode) in a module worker | **Works with workaround** (webpack build) | `new Worker(new URL("./x.worker.ts", import.meta.url), { type: "module" })`. The emscripten glue's `new URL("*.wasm", import.meta.url)` is emitted to `/_next/static/media/*.wasm` (self-hosted, hashed, 250–350 KB each). Allowed by `'wasm-unsafe-eval'`; no CSP violations |
| — | **Turbopack + workers** | **Blocked in WebKit** | Turbopack starts dedicated workers through a bootstrap script that reads its chunk list from the URL fragment (`#params=…`). This is hard-coded in the runtime and cannot be configured. WebKit drops the fragment from the worker's `location`, so the worker throws "Missing worker bootstrap config". 12/12 runs failed in Playwright WebKit 27.2 (Windows); Chromium and Firefox work. Not yet confirmed on real Safari (Phase 9 device matrix). **D-14: build and develop with webpack** |
| P1-T20 | pdf.js 6.4: render page 1 to a canvas | **Works** (webpack) | `GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })`; library loaded with `import("pdfjs-dist")` on intent. pdf.js 6 contains no `eval`/`new Function` (the `isEvalSupported` option no longer exists). Worker 1.26 MB and library chunk 1.18 MB (uncompressed) |
| P1-T21 | pdf-lib merge in a worker | **Works** (webpack) | Two PDFs (1 + 2 pages) merged into 3 pages. Inputs and output are passed as transferables (`postMessage(msg, buffers)`); the input buffers are detached on the sender, so nothing is copied |
| P1-T22 | Serwist PWA: precache + offline | **Works** (webpack; `@serwist/turbopack` 9.5.13 + `esbuild`) | A route handler `app/serwist/[path]/route.ts` (`createSerwistRoute`, force-static) emits `out/serwist/sw.js` at build time; `SerwistProvider swUrl="/serwist/sw.js"` registers it. Required settings: §10 |
| P1-T23 | OG images in static export | **Works with workaround** | `opengraph-image.tsx` + `generateStaticParams` under a dynamic route emits a 1200×630 PNG per param at build; `og:image` uses `metadataBase` (SITE_URL). The file has no extension, so `_headers` sets `Content-Type: image/png` for `/*/opengraph-image`. **Verify on a Cloudflare preview (P1-T17)**; fallback: build script to `public/og/` |
| P1-T24 | CSP + hydration; cross-origin `fetch()` | **Works** | A client counter hydrates and responds under the planned CSP in all browsers, with zero CSP violations and page errors. `fetch("https://example.com", { method: "POST" })` is blocked by `connect-src` (violation reported; no request leaves the browser). This check runs on `main` in `e2e/smoke.spec.ts` |
| P1-T25 | Fonts | **Works** | `geist` package (`next/font/local`): two variable `.woff2` files emitted to `/_next/static/media/` and preloaded; no external font requests (asserted in `e2e/smoke.spec.ts`). `next/font/google` is not used because it downloads from Google at build time |

Build-tool notes:
- Tailwind 4 runs through `@tailwindcss/postcss` (`postcss.config.mjs`), which both bundlers support. The `@tailwindcss/turbopack` loader from the `create-next-app` template was removed with D-14.
- Bundle baseline (webpack, near-empty homepage): **141 KB gzipped JS** from Next.js + React alone, above the 100 KB homepage budget (§14) before any Sprigkit code. See R-14.

---

*Phase 6:* the image tools bundle all six jSquash codecs into one worker (`src/lib/image/image.worker.ts`); each `.wasm` is emitted to `/_next/static/media/` and fetched only when a job needs it. The multithreaded AVIF and oxipng builds need `SharedArrayBuffer` (cross-origin isolation, which the site does not enable), so `next.config.ts` leaves them out with webpack's `IgnorePlugin`; they spawn workers of themselves, which also caused a "circular dependency between chunks" warning.

## 9. State and storage

- **Tool state:** local React state per tool; no global store library. Cross-component state via context only where needed (e.g. files handed from the homepage drop zone to a tool).
- **Homepage → tool file hand-off:** files are kept in an in-memory module store during client-side navigation. If the page reloads, the user re-selects the file (nothing is persisted).
- **Preferences:** `src/lib/storage.ts` wraps `localStorage` with try/catch and Zod validation. Keys are versioned (`ts:v1:theme`, `ts:v1:favorites`, `ts:v1:recent`, `ts:v1:opts:<slug>`). **User content (files, text, tokens) is never stored.** The one exception is sign-pdf's opt-in "Remember my signature on this device" (tool-specifications §3.6): only after the user ticks it, the signature PNG is kept under `ts:v1:sign-pdf:signature`, with a Delete control; it bypasses the options-only helper on purpose.

---

## 10. PWA and offline

- **Serwist** generates the service worker: precache app shell, fonts, and tool pages; runtime-cache lazily loaded libraries/WASM after first use.
- Navigation fallback to cached pages offline.
- Web app manifest with icons and `display: standalone`.
- **Verified in Phase 1 (P1-T22)** with `@serwist/turbopack`. Despite the name, its route-handler integration builds the SW with esbuild and works with webpack builds. Required settings found by the spike:
  - `globIgnores: ["public/_headers", "public/_redirects"]`. Serwist's default glob precaches all of `public/`, but Cloudflare does not serve these config files, so SW install would fail.
  - HTML pages are not in the default precache. List them in `additionalPrecacheEntries` with a revision (commit SHA), including the offline fallback page.
  - Offline fallbacks only apply to requests handled by a runtime route. Add a `NetworkFirst` route for `request.mode === "navigate"` before `defaultCache`.
  - The SW is served from `/serwist/sw.js`. `_headers` must add `Service-Worker-Allowed: /` (scope `/`) and `Cache-Control: no-cache` for it.
  - `navigationPreload: false`: little benefit for static pages, and preload requests bypass Playwright's offline routing.
  - The default precache was ~2.7 MB in the spike because it includes on-intent chunks such as pdf.js. Phase 7 must exclude on-intent libraries and WASM from precache and runtime-cache them after first use.
- Test offline in Chromium with `context.route("**/*", r => r.abort("internetdisconnected"))`. `context.setOffline(true)` did not reproduce real offline behaviour with the SW.

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

The `/*/opengraph-image` rule (`Content-Type: image/png`) is in `public/_headers` since Phase 3. The repo's `public/_headers` also sets `X-Robots-Tag: noindex` for `https://:project.pages.dev/*` and `https://:subdomain.:project.pages.dev/*` (every preview and `pages.dev` host, P1-T16) and immutable caching for `/_next/static/*`. The service-worker and OG-image rules from §10 and §8.4 are added with those features. `scripts/serve-out.mjs` applies the same file locally for E2E and Lighthouse; it drops `upgrade-insecure-requests` because it serves plain HTTP.

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
Lockfile committed; minimal dependencies; Dependabot/Renovate PRs reviewed manually; `npm audit --omit=dev` and license check in CI.

---

## 12. SEO generation

All generated from the registry (see [tool-registry.md](tool-registry.md)):

- `generateMetadata()` per tool: title, description, canonical (`SITE_URL + /slug`), Open Graph, Twitter card. *As built:* `src/lib/seo.ts` (`toolMetadata`, JSON-LD builders) and `app/[tool]/opengraph-image.tsx` (1200×630 PNG per tool, Geist fonts read from the `geist` package at build time, colors from `src/lib/og.ts`, kept equal to the tokens by `tokens.test.ts`). Details and status: [seo-strategy.md](../03-seo-growth/seo-strategy.md).
- JSON-LD per tool page: `BreadcrumbList`, `WebApplication` (free, `applicationCategory`, `operatingSystem: "Any (web browser)"`), `FAQPage` only when FAQs are visible on the page.
- `sitemap.ts`: all live tools, hubs, static pages, guides; `lastModified` from registry `updatedAt`. Only pages that exist are listed (Phase 3: home and the published tools; hubs and static pages are added with their phases).
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
| Performance | Lighthouse CI | Budgets below; warn-only until Phase 9, then fails the build when exceeded |
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
| A-8 | Webpack instead of Turbopack for dev and production (D-14) | Turbopack workers fail to start in WebKit (§8.4) | Slower builds and HMR; revisit when Turbopack's worker bootstrap no longer relies on the URL fragment |
