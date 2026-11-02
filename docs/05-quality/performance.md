# Performance

| | |
|---|---|
| **Last updated** | 2026-11-02 (Phase 9: budgets set and enforced, all 26 page URLs measured) |
| **Related** | [architecture.md §14](../04-architecture/architecture.md#14-performance-budgets-target) · [testing-strategy.md](testing-strategy.md) · [risks-and-decisions.md](../06-delivery/risks-and-decisions.md) (R-14) |

## 1. Budgets

The targets are in [architecture.md §14](../04-architecture/architecture.md#14-performance-budgets-target). Lighthouse CI (`lighthouserc.cjs`, mobile emulation, 3 runs per URL) **enforces** these budgets since P9-T08 (owner decision 2026-11-02, R-14): the measured Phase 9 baseline plus a margin for noise.

| Budget | Homepage | Every other page (hubs, tools, site pages, guides) |
|---|---|---|
| Performance | ≥ 80 | ≥ 75 |
| LCP (simulated) | ≤ 4.0 s | ≤ 4.5 s |
| TBT (lab proxy for INP) | ≤ 400 ms | ≤ 500 ms |
| Initial JS (gzipped transfer) | ≤ 300 KB | ≤ 340 KB |
| Accessibility · Best Practices · SEO | 100 · ≥ 95 · 100 | 100 · ≥ 95 · 100 |
| CLS · font files | ≤ 0.1 · ≤ 2 | ≤ 0.1 · ≤ 2 |

INP can only be measured in the field; TBT is the lab stand-in, and `e2e/inp.spec.ts` measures real interaction latency on a 4× slowed CPU (§2.3).

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

## 2.3 Phase 9: enforced budgets

Measured 2026-11-02 with `lhci collect` on a quiet machine (3 runs per URL; median, worst run in brackets), after loading toasts on intent (−10 KB on every page, P9-T08).

| Page | Perf | A11y | BP | SEO | LCP | TBT | CLS | Script |
|---|---|---|---|---|---|---|---|---|
| `/` | 84 | 100 | 100 | 100 | 3.55 s | 271 ms (287) | 0.001 | 255 KB |
| Hubs (3) | 89–90 | 100 | 100 | 100 | 3.07–3.21 s | 204–224 ms (243) | ≤ 0.006 | 270 KB |
| Developer tools (8) | 80–85 | 100 | 100 | 100 | 3.46–3.88 s | 230–419 ms (419) | ≤ 0.030 | 282–309 KB |
| PDF tools (6) | 82–85 | 100 | 100 | 100 | 3.70–3.94 s | 228–291 ms (293) | ≤ 0.003 | 289–318 KB |
| Image tools (4) | 80–83 | 100 | 100 | 100 | 3.86–3.92 s | 236–336 ms (358) | ≤ 0.018 | 300–320 KB |
| `/about` | 89 | 100 | 100 | 100 | 2.89 s | 274 ms (304) | 0 | 257 KB |
| `/guides` | 93 | 100 | 96 | 100 | 2.82 s | 195 ms (280) | 0 | 257 KB |
| `/guides/heic-vs-jpg` | 87 | 100 | 100 | 100 | 3.18 s | 257 ms (269) | 0 | 257 KB |

Findings:
- **LCP is simulated JavaScript time, not a late paint.** In the observed (unthrottled) trace, FCP and LCP are both ≈ 0.3 s: the H1 is in the static HTML and paints on the first frame. Lighthouse's simulated slow phone attributes ≈ 0.8 s of script evaluation (mostly the Next.js runtime chunk) to the LCP, which puts it at 2.8–3.9 s. The 2.5 s target can't be met without shipping less framework code.
- **Initial JS** (from the built HTML, gzipped): 214 KB on every page before page code, of which ≈ 132 KB is Next.js and React. The shell adds Radix Tooltip with Popper (≈ 20 KB), Motion (≈ 13 KB) and the theme menu (≈ 6 KB). The polyfills chunk (39 KB) is `noModule` and never loads in supported browsers. Lighthouse's larger figures include the tool UI chunk and `<Link>` prefetches loaded after `load`.
- **Not done, and why:** loading tooltips or the theme menu on intent would swap the button under the user's focus (focus loss); ≈ 25 KB isn't worth that risk. Geist fonts are not preloaded; with `font-display: swap` and size-adjusted fallbacks they don't affect LCP or CLS.
- **Interaction latency (P9-T10)**, `npm run e2e:inp` (Event Timing API, Chromium, CPU slowed 4×, one worker; worst interaction of 3 runs):

  | Interaction | Before | After |
  |---|---|---|
  | Typing in the JSON editor, 40 KB formatted (85 KB, 2,800 lines) | 248 ms | 152–216 ms |
  | Typing in the JSON editor, 40 KB minified (one line) | 576–664 ms | 272–432 ms |
  | Organize PDF, 300-page grid: select and move with arrows | 224 ms | 104–160 ms |
  | Compress Image: quality slider · comparison slider | 56–112 ms · 40–48 ms | unchanged |

  Two fixes: (1) the sliding indicators of `SegmentedControl` and `Tabs` are memoized, because a Motion `layoutId` element measures the page (`measureScroll`) every time it renders, and tool UIs re-render on every keystroke; (2) `CodeEditor`'s `setValue` replaces only the changed span, so the output editor and its parser update incrementally instead of re-parsing the whole document. Moving JSON formatting to the worker for inputs over 32 KB made no difference and was reverted. Typing inside one very long line stays CodeMirror's slow case (it redraws the line on every key); formatted JSON is at the 200 ms budget on this lab setup. The full E2E suite only logs these timings (parallel workers distort them).
- Field INP and real mid-range-phone traces remain P9-T11.

## 3. Rules that keep us inside the budgets

- Server components by default; `"use client"` only for interactive parts.
- Heavy libraries (pdf.js, pdf-lib, jSquash, CodeMirror) load **on intent** with dynamic `import()` or inside workers, never in the initial bundle. Spike sizes (uncompressed): pdf.js library 1.18 MB plus worker 1.26 MB; jSquash WASM 250–350 KB per codec.
- No layout shift when the tool UI hydrates: the static shell reserves the tool's space ([architecture.md §7](../04-architecture/architecture.md#7-rendering-model)).
- Check the Lighthouse report artifact in CI on every change that adds a dependency or a client component.
