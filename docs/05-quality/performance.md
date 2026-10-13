# Performance

| | |
|---|---|
| **Last updated** | 2026-10-13 (Phase 2 shell measured) |
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
| Tool page initial JS ≤ 120 KB gzipped | Added with the tool page template (Phase 3) | — |
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

## 3. Rules that keep us inside the budgets

- Server components by default; `"use client"` only for interactive parts.
- Heavy libraries (pdf.js, pdf-lib, jSquash, CodeMirror) load **on intent** with dynamic `import()` or inside workers, never in the initial bundle. Spike sizes (uncompressed): pdf.js library 1.18 MB plus worker 1.26 MB; jSquash WASM 250–350 KB per codec.
- No layout shift when the tool UI hydrates: the static shell reserves the tool's space ([architecture.md §7](../04-architecture/architecture.md#7-rendering-model)).
- Check the Lighthouse report artifact in CI on every change that adds a dependency or a client component.
