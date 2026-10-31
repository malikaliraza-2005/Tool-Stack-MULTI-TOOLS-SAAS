# Testing Strategy

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: tool platform and pilot tests) |
| **Related** | [architecture.md §13](../04-architecture/architecture.md#13-testing) · [performance.md](performance.md) · [browser-device-support.md](browser-device-support.md) · [mvp-scope.md §6](../01-product/mvp-scope.md#6-definition-of-done-per-tool) |

This document says **how** Sprigkit is tested and which command runs each layer. What each tool must pass is defined per tool in [tool-specifications.md](../04-architecture/tool-specifications.md) and in the Definition of Done.

---

## 1. Layers

| Layer | Tool | Command | Runs against | Where |
|---|---|---|---|---|
| Types | TypeScript (strict, `noUncheckedIndexedAccess`) | `npm run typecheck` | Source | CI + local |
| Lint / format | ESLint (`eslint-config-next`, zero warnings), Prettier | `npm run lint`, `npm run format:check` | Source | CI + local |
| Unit | Vitest | `npm run test` | `src/**/*.test.ts(x)`, `scripts/**/*.test.mjs` | CI + local |
| E2E | Playwright | `npm run e2e` | The **production build** (`out/`) | CI + local |
| Privacy (no network) | Playwright fixture | part of `e2e` | Every E2E test | CI + local |
| CSP | Playwright fixture | part of `e2e` | Every E2E test | CI + local |
| Accessibility | @axe-core/playwright | part of `e2e` | Pages that call `expectNoA11yViolations` | CI + local |
| Performance | Lighthouse CI | `npm run lhci` | Production build | CI (warn-only until P9) |
| Licenses | `scripts/check-licenses.mjs` | `npm run licenses` | `node_modules` | CI + local |
| Visual / motion | Manual checklist | — | Running site, both themes, mobile width, keyboard only, reduced motion | Before a phase exits |

## 2. Unit tests (Vitest)

- Every `src/tools/<slug>/logic.ts` has `logic.test.ts` next to it: normal cases, edge cases and **every** error code. Fixtures go in `src/tools/<slug>/__fixtures__/`.
- `logic.ts` is pure (no DOM, no React), so tests run in Node (`environment: "node"`). Use a DOM environment only where a test really needs it.
- Registry tests (`src/tools/registry.test.ts`): one test per validation rule (tool-registry §3), plus `assertValidRegistry` throwing on a deliberately broken entry. Verified once by hand that a broken entry fails `next build`.
- Shared libraries: `src/lib/files/files.test.ts` (magic bytes, limits, names, ZIP), `src/lib/worker/runner.test.ts` (a fake worker running the real `expose()`: results, transferables, progress, error mapping, cancel, timeout, recovery), `src/lib/shared.test.ts` (errors, storage, detectors incl. the ≤ 1 ms budget, pdf.js asset version), `src/lib/seo.test.ts` (metadata, JSON-LD).
- Pilot fixtures are generated in code (`src/tools/merge-pdf/__fixtures__/pdfs.ts`) and shared by unit and E2E tests.
- Design tokens (`src/styles/tokens.test.ts`): WCAG contrast of every token pair in both themes, and parity between CSS tokens and their TypeScript mirrors (`src/lib/motion.ts`, `THEME_BG`).
- Theme (`src/lib/theme.test.ts`): preference parsing and the inline pre-paint script, run in a `node:vm` sandbox.
- Lint rule (`scripts/eslint/no-hardcoded-design.test.mjs`): ESLint `RuleTester` cases.

## 3. E2E tests (Playwright)

- **Always against the production build.** `npm run build` first. Playwright starts `scripts/serve-out.mjs`, which serves `out/` the way Cloudflare Pages does: clean URLs, `404.html` with status 404, gzip, and the headers from `public/_headers` (CSP included). Tests therefore see the production CSP.
- **Projects:** `chromium`, `firefox`, `webkit` (desktop), `mobile` (Pixel 7, Chromium) and `iphone` (iPhone 14, WebKit; added in Phase 3 after a phone-only bug).
- **Startup:** `Providers` sets `data-app-started` on `<html>`. `expectNoA11yViolations` waits for it (and for running animations), because before start-up Radix roving-focus groups render `tabindex="-1"`, which made axe checks flaky. `e2e/smoke.spec.ts` checks the startup notice stays hidden normally and appears when the scripts are blocked.
- **File pickers must work before hydration** (found on a phone in Phase 3): "Choose files" was a button that called `input.click()`, so a tap before JavaScript loaded did nothing. File-picker buttons are now `<label>`s for the real input; `e2e/tools/merge-pdf.spec.ts` checks the picker opens with JavaScript disabled. See [browser-device-support.md](browser-device-support.md).
- **Import from `e2e/fixtures.ts`, not `@playwright/test`.** The fixtures are automatic:
  - `noNetwork`: records every HTTP request from the page and its workers. The test fails if any request goes to another origin (`data:` and `blob:` are local). This is the automated proof of "0 bytes uploaded" ([mvp-scope.md §6](../01-product/mvp-scope.md#6-definition-of-done-per-tool)). **Limits:** Playwright reports service-worker requests in Chromium only, and WebSocket/WebRTC traffic is not recorded. The CSP (`connect-src`) blocks fetch/XHR/WebSocket to other origins in every browser, and Phase 7 SW tests must run in Chromium.
  - `csp`: fails the test on any CSP violation reported on the **document** or any uncaught page error. A test that expects a violation calls `csp.allowViolations()` and asserts `await csp.violations()` itself. **Limit:** violations inside workers are not reported to the document; worker-based tool tests must assert the tool's result, so a blocked request inside a worker shows up as a failed flow.
  - `noOverflow`: fails the test if the page it ends on is wider than the viewport, listing the outermost elements that stick out (added in Phase 3 after Merge PDF overflowed on a 360px phone: a grid without `grid-cols-1` sized its column to its widest content). It checks only the final state; to check an intermediate state, call `horizontalOverflow(page)`. `e2e/layout.spec.ts` checks every page and the tools' filled states at 320px (narrowest supported width).
- **Accessibility:** call `expectNoA11yViolations(page)` (WCAG 2.0/2.1/2.2 A and AA rules) on every page and state that a test reaches, in both themes (`page.emulateMedia({ colorScheme })`).
- **Shell (`e2e/shell.spec.ts`, Phase 2):** landmarks and skip link, header/mobile navigation, theme pre-paint, persistence and View Transition (skipped under reduced motion), command palette (shortcut, action, Esc + focus restore), gallery `noindex`, dialog focus trap/restore, keyboard operation of SegmentedControl and Tabs, CopyButton announcement, axe on gallery/home/404 in both themes.
- **Browser quirks in tests:** WebKit does not focus buttons or links on click/Tab by default (as in Safari), so keyboard tests focus elements explicitly; Playwright's Firefox ignores `prefers-color-scheme` emulation in `matchMedia()`, and only Chromium fires `matchMedia` change events when emulation changes. Radix arrow-key selection needs the key held (`keyboard.down`/`up`), because Playwright releases it before Radix moves focus.
- The fixtures were checked against a deliberate leak: a navigation to another origin fails the test with "requests left the origin".
- **Tools (Phase 3):** `e2e/tools/<slug>.spec.ts` per tool (main flow, errors, keyboard, axe in both themes, downloaded contents checked) and `e2e/seo.spec.ts` (metadata, canonical, OG image, JSON-LD vs visible FAQs, sitemap, robots, static HTML without JavaScript). The 20 MB JSON test runs in desktop Chromium only and measures the longest main-thread frame gap; its 10 s limit is a regression guard sized for parallel runs (alone it measures 1.9–2.5 s).
- **Hydration race (found in Phase 3):** WebKit hydrates later than the other engines, and tests that set files right after `goto` showed that file inputs lost files chosen before hydration. Components now pick such files up on mount, so tests don't need to wait for hydration.
- Running all four projects in parallel on a small machine causes occasional timeouts (WebKit axe, Firefox protocol errors). Re-run with `--workers=2` before treating them as failures; CI uses 2 workers.
- **Offline / service worker** (Phase 7): simulate offline in Chromium with `context.route("**/*", r => r.abort("internetdisconnected"))`. `context.setOffline(true)` did not reproduce real offline behaviour with the service worker ([architecture.md §10](../04-architecture/architecture.md#10-pwa-and-offline)).

## 4. Lighthouse CI

- Config: `lighthouserc.cjs`. Runs three times on the built homepage, mobile emulation, served by `scripts/serve-out.mjs`.
- Budgets come from [architecture.md §14](../04-architecture/architecture.md#14-performance-budgets-target) and [performance.md](performance.md). They are **warn-only** until Phase 9, when `level` switches to `"error"`.
- Reports are written to `.lighthouseci/reports/` and uploaded as a CI artifact. Nothing is uploaded to public storage.

## 5. CI pipeline

`.github/workflows/ci.yml` runs on every push and pull request:

install (`npm ci`) → typecheck → lint + format check → unit tests → build → Playwright browsers → E2E → Lighthouse CI → license check → upload reports (Playwright HTML report, Lighthouse reports, `licenses.json`).

Any failing stage fails the run, except Lighthouse assertions, which only warn until P9. `npm audit --omit=dev --audit-level=high` runs after install (production dependencies only; dev tooling such as Lighthouse CI has known advisories that never ship).

## 6. Adding tests for a new tool

1. `logic.test.ts` for every function and error code.
2. One E2E spec per tool covering the main flow (file or text in → result out → download) on all projects, using the shared fixtures, so the no-network and CSP checks run automatically.
3. `expectNoA11yViolations` on the empty, working and result states.
4. Add the tool page URL to `lighthouserc.cjs` (tool URLs get the 120 KB script budget via `assertMatrix`).
