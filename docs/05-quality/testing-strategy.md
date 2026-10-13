# Testing Strategy

| | |
|---|---|
| **Last updated** | 2026-10-13 (Phase 1: test tooling in place) |
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
- Registry tests (Phase 3): schema validity, unique slugs/titles/descriptions, related slugs exist, no reserved slugs.

## 3. E2E tests (Playwright)

- **Always against the production build.** `npm run build` first. Playwright starts `scripts/serve-out.mjs`, which serves `out/` the way Cloudflare Pages does: clean URLs, `404.html` with status 404, gzip, and the headers from `public/_headers` (CSP included). Tests therefore see the production CSP.
- **Projects:** `chromium`, `firefox`, `webkit` (desktop) and `mobile` (Pixel 7 viewport, Chromium). See [browser-device-support.md](browser-device-support.md).
- **Import from `e2e/fixtures.ts`, not `@playwright/test`.** The fixtures are automatic:
  - `noNetwork`: records every HTTP request from the page and its workers. The test fails if any request goes to another origin (`data:` and `blob:` are local). This is the automated proof of "0 bytes uploaded" ([mvp-scope.md §6](../01-product/mvp-scope.md#6-definition-of-done-per-tool)). **Limits:** Playwright reports service-worker requests in Chromium only, and WebSocket/WebRTC traffic is not recorded. The CSP (`connect-src`) blocks fetch/XHR/WebSocket to other origins in every browser, and Phase 7 SW tests must run in Chromium.
  - `csp`: fails the test on any CSP violation reported on the **document** or any uncaught page error. A test that expects a violation calls `csp.allowViolations()` and asserts `await csp.violations()` itself. **Limit:** violations inside workers are not reported to the document; worker-based tool tests must assert the tool's result, so a blocked request inside a worker shows up as a failed flow.
- **Accessibility:** call `expectNoA11yViolations(page)` (WCAG 2.0/2.1/2.2 A and AA rules) on every page and state that a test reaches. Run it in both themes once theming exists (Phase 2).
- The fixtures were checked against a deliberate leak: a navigation to another origin fails the test with "requests left the origin".
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
4. Add the tool page URL to `lighthouserc.cjs` when the tool page template exists (Phase 3).
