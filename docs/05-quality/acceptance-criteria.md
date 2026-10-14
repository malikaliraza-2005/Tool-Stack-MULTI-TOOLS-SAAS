# Acceptance Criteria

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: gates defined; pilot results recorded) |
| **Related** | [mvp-scope.md §6](../01-product/mvp-scope.md#6-definition-of-done-per-tool) · [testing-strategy.md](testing-strategy.md) · [performance.md](performance.md) · [browser-device-support.md](browser-device-support.md) |

Release gates: what must be true before a tool or page ships. The Definition of Done (mvp-scope §6) is the source; this document turns each item into a check with a command or a manual step, and records where each pilot stands.

---

## 1. Gates per tool

| # | Gate (DoD item) | How it is checked | Automated |
|---|---|---|---|
| G1 | Behaviour matches tool-specifications, all error cases (DoD 1) | Unit tests from the spec's acceptance tests (`logic.test.ts`); E2E for each error the user can see | Yes |
| G2 | Unit tests for logic; E2E for the main flow (DoD 2) | `npm run test`, `npm run e2e` | Yes |
| G3 | No network requests during processing (DoD 3) | `noNetwork` fixture in every E2E test | Yes |
| G4 | Works offline after first load (DoD 4) | Chromium E2E with the service worker | From Phase 7 (G-5) |
| G5 | Keyboard only; axe clean; announcements for results and errors (DoD 5) | E2E keyboard flows; `expectNoA11yViolations` in empty, working and result states, both themes; manual screen-reader check | Partly |
| G6 | Motion rules and performance budgets (DoD 6) | Manual motion checklist (design-system §7.4); `npm run lhci` | Partly (warn-only until P9) |
| G7 | Chrome, Firefox, Safari (macOS, iOS), mid-range Android (DoD 7) | Playwright Chromium/Firefox/WebKit/mobile viewport + real devices | Partly |
| G8 | Registry entry complete; structured data valid (DoD 8) | Registry rules fail the build; JSON-LD unit + E2E tests; Rich Results Test on a preview | Partly |
| G9 | Supporting content written and reviewed (DoD 9) | Build fails without `content.tsx`; owner review | Partly |
| G10 | Every dependency in the license register (DoD 10) | `npm run licenses`; register updated in the same change | Yes |

## 2. Gates per page (all pages)

| Gate | Check |
|---|---|
| Static HTML is meaningful without JavaScript | E2E with JavaScript disabled (`e2e/seo.spec.ts` for tool pages) |
| Unique title, description, H1; canonical | Registry rules; `e2e/seo.spec.ts` |
| No CSP violation, no uncaught error | `csp` fixture |
| axe: 0 violations, both themes | `expectNoA11yViolations` |
| 320 px width, 200% zoom: no horizontal page scroll | Manual (accessibility.md §2) |
| Lighthouse: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100 | `npm run lhci` |

## 3. Pilot status (2026-10-14)

| Gate | json-formatter | merge-pdf |
|---|---|---|
| G1 | ✅ 5/5 spec acceptance tests (unit) + E2E error cases | ✅ 6/6 spec acceptance tests (unit + E2E; test 6 = `noNetwork`) |
| G2 | ✅ | ✅ |
| G3 | ✅ all projects | ✅ all projects |
| G4 | ⏳ Phase 7 (`processing.offline: false`) | ⏳ Phase 7 |
| G5 | ✅ automated (axe all states, keyboard tree and editors). ❌ screen-reader spot check not done | ✅ automated (axe all states, keyboard reorder/remove, focus on result). ❌ screen-reader spot check not done |
| G6 | ❌ Lighthouse Performance 73–79 (LCP ≈ 3.8 s, TBT 350–580 ms); motion checklist not done on devices | ❌ Performance 82–84 (LCP ≈ 3.7 s); touch drag not checked on a device |
| G7 | ⚠️ Playwright engines pass; real Safari/iOS/Android not tested (P3-T24) | ⚠️ same |
| G8 | ✅ registry + JSON-LD tests. ❌ Rich Results Test on preview not run | ✅ / ❌ same |
| G9 | ⚠️ written; owner review pending | ⚠️ written; owner review pending |
| G10 | ✅ | ✅ (`pako` exception awaits owner review) |

Accessibility 100, Best Practices 100 and SEO 100 in Lighthouse for both pilots. Performance details: [performance.md §2.2](performance.md#22-phase-3-tool-pages).
