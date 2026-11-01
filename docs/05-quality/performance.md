# Performance

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3 tool pages measured) |
| **Related** | [architecture.md §14](../04-architecture/architecture.md#14-performance-budgets-target) · [testing-strategy.md](testing-strategy.md) · [risks-and-decisions.md](../06-delivery/risks-and-decisions.md) (R-14) |

## 1. Budgets **[Target]**

The budgets are defined in [architecture.md §14](../04-architecture/architecture.md#14-performance-budgets-target) and enforced by Lighthouse CI (`lighthouserc.cjs`):

| Budget | Lighthouse CI assertion | Level |
|---|---|---|
| Performance ≥ 90 | `categories:performance` minScore 0.9 | warn until P9 |
| Accessibility 100 | `categories:accessibility` minScore 1 | warn until P9 |
| Best Practices ≥ 95 | `categories:best-practices` minScore 0.95 | warn until P9 |
| SEO 100 | `categories:seo` minScore 1 | warn until P9 |
| LCP ≤ 2.5 s | `largest-contentful-paint` ≤ 2500 ms | warn until P9 |
| CLS ≤ 0.1 | `cumulative-layout-shift` ≤ 0.1 | warn until P9 |
| INP ≤ 200 ms (field) | lab proxy: `total-blocking-time` ≤ 200 ms | warn until P9 |
| Homepage initial JS ≤ 100 KB gzipped | `resource-summary:script:size` ≤ 102 400 bytes (transfer size, gzip) | warn until P9 |
| Tool page initial JS ≤ 120 KB gzipped | `resource-summary:script:size` ≤ 122 880 bytes on tool URLs (`assertMatrix` in `lighthouserc.cjs`, Phase 3) | warn until P9 |
| ≤ 2 font files | `resource-summary:font:count` ≤ 2 | warn until P9 |

INP can only be measured in the field; TBT is the lab stand-in.

## 2. Phase 1 baseline

Measured 2026-10-13 with Lighthouse CI (mobile emulation, 3 runs, local server with gzip). Page: the placeholder homepage (an H1 and a paragraph, Geist fonts, no client components). Next.js 16.4.0, React 19.3.0.

| Build | Performance | A11y | Best Practices | SEO | LCP | TBT | CLS | Script transfer |
|---|---|---|---|---|---|---|---|---|
| **Webpack (current, D-14)** | 97–98 | 100 | 100 | 100 | 2.14–2.21 s | 81–139 ms | 0 | **141 KB** |
| Turbopack (before D-14) | 95 | 100 | 100 | 100 | 2.65–2.76 s | ~123 ms | 0 | 145 KB |

**Finding (R-14):** Next.js + React alone ship about 141 KB of gzipped JS, which is above the 100 KB homepage budget before any Sprigkit code exists. The budget cannot be met as written. The owner needs to decide by Phase 9 whether to raise it (baseline + headroom) or accept the overrun. Until then the assertion warns.

Fonts: 2 `.woff2` files (Geist Sans + Mono variable), preloaded.

## 2.1 Phase 2: app shell

Measured 2026-10-13 with Lighthouse CI (same setup), homepage with the full shell (header with theme menu, search trigger, mobile menu; footer; toaster; Motion provider).

| Performance | A11y | Best Practices | SEO | LCP | TBT | CLS | Script transfer | Fonts |
|---|---|---|---|---|---|---|---|---|
| 92–95 | 100 | 100 | 100 | 2.60–2.72 s | 177–226 ms | 0 | **240 KB** (+99 KB) | 1 |

Where the shell's JS goes (gzip, from the built chunks): Radix (Tooltip, DropdownMenu, Dialog with popper, focus scope, dismissable layer) ≈ 38 KB; sonner + Motion (`m`, `LazyMotion`, `MotionConfig`) + Lucide icons ≈ 22 KB; layout and shell components ≈ 8 KB. Motion's `domMax` features load in a separate chunk after hydration; cmdk and the palette load on intent.

LCP and TBT warnings are new versus Phase 1 (LCP 2.1 s → 2.6 s, TBT up to 226 ms). Not optimized yet:
- Loading the theme menu and mobile menu sheet on intent would save ≈ 15 KB (measured by removing them) but needs a focus-preserving swap of the trigger. Deferred to Phase 9 with R-14.
- Toaster could mount on first toast instead of at load.

## 2.2 Phase 3: tool pages

Measured 2026-10-14 with Lighthouse CI (same setup, 3 runs per page, on a busy development machine; the homepage scored 86–92 in the same run vs 92–95 in Phase 2, so absolute values are pessimistic).

| Page | Performance | A11y | BP | SEO | LCP | TBT | CLS | Script transfer |
|---|---|---|---|---|---|---|---|---|
| `/` | 86–92 | 100 | 100 | 100 | 2.3–3.0 s | 216–375 ms | 0 | 247 KB |
| `/merge-pdf` | 82–84 | 100 | 100 | 100 | 3.6–3.8 s | 240–335 ms | ≤ 0.003 | 267 KB (+20 KB) |
| `/json-formatter` | 73–79 | 100 | 100 | 100 | 3.8–4.0 s | 348–576 ms | 0 | 291 KB (+44 KB) |

Findings:
- **The 120 KB tool-page budget cannot be met** while the framework and shell alone ship 247 KB (R-14). The tools' own initial JS is small: +20 KB for merge-pdf, +44 KB for json-formatter (UI chunk, Workbench, Radix Select/Switch, `zod/mini`, TanStack Virtual).
- LCP is the tagline or H1 (text), and all of the LCP time is render delay behind JavaScript evaluation on Lighthouse's simulated slow CPU; images and fonts are not the cause.
- Loading CodeMirror when the browser was idle added 154 KB to json-formatter's measured JS and TBT; it now loads on intent (hover, focus or content), which removed 110 KB from page load.
- No layout shift from hydration: the tool UIs are pre-rendered at build time.
- 20 MB JSON: parsing and formatting run in the worker (≈ 5.5 s end to end on a desktop); the longest main-thread block is ≈ 1.2 s while CodeMirror builds its documents. Before large text was kept out of `<textarea>`, the page froze for 30–45 s.

Not yet done: tracing on a mid-range Android phone (P9-T11). The owner accepted these results to close Phase 3 (2026-10-31, R-14); the budget decision is P9-T08.

### Phase 7: homepage and hubs

Measured 2026-11-02 with `lhci collect` (3 runs per page, same machine and settings as Phase 3). The hubs are now in `lighthouserc.cjs`.

| Page | Performance | A11y | BP | SEO | LCP | TBT | CLS | Script transfer |
|---|---|---|---|---|---|---|---|---|
| `/` | 85 | 100 | 100 | 100 | 3.58–3.59 s | 228–244 ms | 0.001 | 265 KB (+18 KB vs Phase 3) |
| `/pdf-tools` | 85–89 | 100 | 100 | 100 | 3.27–3.35 s | 200–289 ms | 0.004 | 280 KB |

Findings:
- **Homepage budget (≤ 100 KB) not met** (Phase 7 exit criterion); the cause is the R-14 baseline, not the homepage itself. The hero adds about 18 KB (hero component, detectors, suggestion logic, tool icons). Fuse.js loads on search focus, the palette on intent, `@serwist/window` after `load`.
- LCP is the hero headline (not animated). It rose from 2.3–3.0 s to about 3.6 s, as render delay behind JavaScript evaluation on the simulated slow CPU, as in Phase 3. Over the 2.5 s target.
- The hubs ship no client code of their own; the extra script over the homepage is `<Link>` prefetching of the tool pages in view.
- Accessibility, Best Practices and SEO are 100; no layout shift from the entrance animation (opacity and transform only).

Deferred to Phase 9 with R-14 (P9-T08 budget decision, P9-T11 device traces).

## 3. Rules that keep us inside the budgets

- Server components by default; `"use client"` only for interactive parts.
- Heavy libraries (pdf.js, pdf-lib, jSquash, CodeMirror) load **on intent** with dynamic `import()` or inside workers, never in the initial bundle. Spike sizes (uncompressed): pdf.js library 1.18 MB plus worker 1.26 MB; jSquash WASM 250–350 KB per codec.
- No layout shift when the tool UI hydrates: the static shell reserves the tool's space ([architecture.md §7](../04-architecture/architecture.md#7-rendering-model)).
- Check the Lighthouse report artifact in CI on every change that adds a dependency or a client component.
