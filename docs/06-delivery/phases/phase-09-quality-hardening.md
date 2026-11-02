# Phase 9: Quality Hardening

| | |
|---|---|
| **Status** | 🟨 In progress |
| **Effort** | 5–7 days [Estimate] |
| **Milestone** | M6: Launch-ready |

## Goal
Prove the whole site meets every release gate: correctness, accessibility, performance, motion quality, security, privacy, and SEO, across real browsers and devices.

## Entry criteria
- M5 reached (P7 and P8 done).

## Read first
- `05-quality/acceptance-criteria.md` (from P3)
- `05-quality/browser-device-support.md`
- [design-system.md §7.4 and §9](../../02-design/design-system.md#74-rules-acceptance-criteria)
- [architecture.md §11, §13–14](../../04-architecture/architecture.md#11-security-and-privacy)

## Deliverables
All gates passing; issues fixed; launch checklist and analytics plan written.

## Tasks

### Functional & device testing
- [ ] **P9-T01** Full device matrix run: Chrome, Edge, Firefox, Safari (macOS), Safari (iOS, real device), Chrome (mid-range Android, real device). Every tool's main flow + one error flow. The Phase 3 pilots have never run on real Safari: give them the full Definition of Done there (deferred from P3-T24). The same for the 8 Phase 4 developer tools on real Android and Safari (deferred from P4-T10), including whether the theme switch's View Transition crashes Safari on long pages, as it does Playwright's WebKit.
- [ ] **P9-T02** Large-file and memory testing on mobile; confirm limits and error messages. From the P8-T04 content review: registry `limits` are not enforced on pasted text in jwt-decoder (64 KB / 1 MB) and regex-tester (1 MB / 10 MB), and json-formatter and base64-encode-decode enforce 50 MB only on opened files. Enforce them or change the registry. Going over a file-count limit (e.g. 101 files in merge-pdf) shows a byte-size message (`src/lib/files/limits.ts`); give it its own message.
  - *Done (code):* `checkTextLimits` enforces the registry hard limit on pasted text in all four tools (UTF-8 bytes); `maxFiles` now has its own `tooManyFiles` message. Mobile large-file and memory testing still to do.
- [ ] **P9-T03** Fix all P0/P1 bugs; log the rest.

### Accessibility
- [ ] **P9-T04** axe on every page (both themes): zero violations.
  - *Progress:* `e2e/a11y.spec.ts` runs axe on every sitemap page and the 404 page in both themes; passes in Chromium (33 pages). Other projects: see the full run.
- [ ] **P9-T05** Manual keyboard-only pass of every tool, including drag-and-drop alternatives.
- [ ] **P9-T06** Screen-reader pass (NVDA on Windows; VoiceOver on iOS for key flows).
- [ ] **P9-T07** 200% zoom and 320px width pass.

### Performance
- [ ] **P9-T08** Switch Lighthouse CI budgets from warn to **enforce**; fix every failure.
- [ ] **P9-T09** Bundle analysis: confirm heavy libraries load only on intent; initial JS within budget on every page.
- [ ] **P9-T10** INP check of heavy interactions (typing in workbench, thumbnail grid, sliders).

### Motion & visual QA
- [ ] **P9-T11** Walk through every page and interaction against design-system §7.4 on the running site (both themes, reduced motion, mid-range phone traces).
- [ ] **P9-T12** Visual consistency pass: token usage, spacing rhythm, empty/error states, copy tone. Includes the owner's second read of the Phase 8 guides and the About, Privacy and Terms pages (content-strategy §4).

### Security & privacy
- [ ] **P9-T13** Security review: CSP verified on production headers; no `dangerouslySetInnerHTML` with user content; malicious file fixtures (malformed PDF, decompression bombs, huge dimensions) handled safely.
  - *Progress:* static review: `dangerouslySetInnerHTML` only for the theme and startup scripts (constants) and JSON-LD (escaped by `serializeJsonLd`). Found and fixed: jpg-to-pdf didn't apply the pixel limit, so a small PNG declaring a huge image would be decoded; it now uses `checkPixels` with `MAX_PIXELS` (moved to `src/lib/image/pipeline.ts`), with unit and E2E tests. Still to do: PDF bombs, production headers.
- [ ] **P9-T14** Privacy verification: no-network E2E for all 19 tools; localStorage contains no user content; analytics sends no content.
  - *Progress:* no-network already runs on every E2E test (`noNetwork` fixture). New `noStoredContent` fixture fails any test that leaves a storage key outside the allow-list (theme, tool options, favorites, recent, opt-in signature); stored option schemas hold no content (only flags, time zone, colour). Analytics: depends on P9-T19.
- [ ] **P9-T15** `npm audit` clean (or documented exceptions); license gate green; Licenses page current. Owner decides on `pako` (Zlib): add Zlib to the allow-list or keep the named exception ([dependencies-licenses.md §3.1](../../04-architecture/dependencies-licenses.md)).
  - *Decided:* Zlib added to the licence allow-list (pako exception removed); the dev-only `npm audit` findings are documented exceptions (dependencies-licenses.md §3.0). `npm audit --omit=dev`: 0.

### SEO
- [ ] **P9-T16** Crawl the preview (free crawler or custom script): no broken links, correct canonicals, no orphan pages, sitemap complete. Run Google's Rich Results Test and the Schema.org validator on one page of each type (home, hub, tool, site page, guide index, guide), deferred from P3-T07 and P8-T14; `e2e/structured-data.spec.ts` already checks every page locally.
  - *Progress:* `e2e/crawl.spec.ts` crawls the local build from `/`: no broken internal links, canonicals match, no orphan pages. The crawl of the preview and the Rich Results Test remain.
- [ ] **P9-T17** Verify production build will be indexable (no stray `noindex`) and previews are not.
  - *Progress:* only 404, `_not-found` and `_gallery` carry `noindex`; `*.pages.dev` gets `X-Robots-Tag: noindex`. A production build (`CF_PAGES_BRANCH=main`) without an `https://` `NEXT_PUBLIC_SITE_URL` now fails (`next.config.ts`). Check headers on production at launch.

### Launch preparation
- [ ] **P9-T18** Write `06-delivery/launch-checklist.md` and do a dry run.
  - *Progress:* [launch-checklist.md](../launch-checklist.md) written; dry run on a preview still to do.
- [x] **P9-T19** Write `06-delivery/analytics-monitoring.md`; decide analytics provider (Cloudflare Web Analytics proposed); add its hosts to CSP and Privacy page.
  - *Done:* owner decided no analytics at launch (2026-11-02); [analytics-monitoring.md](../analytics-monitoring.md) written; CSP and Privacy page unchanged; P10-T03 skipped.

## Docs to write / update
launch-checklist.md · analytics-monitoring.md · browser-device-support.md (final) · acceptance-criteria.md (results)

## Exit criteria (release gates)
- [ ] All tools pass the Definition of Done on the full device matrix.
- [ ] Zero axe violations; manual keyboard and screen-reader passes complete.
- [ ] Lighthouse budgets enforced and passing on every page type.
- [ ] No-network test passes for all tools; CSP verified in production.
- [ ] No known P0/P1 bugs.
- [ ] Launch checklist dry run complete.

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| A tool can't meet the gates in time | Ship it as `beta` (labelled) or hide it (`status: "hidden"`) and launch the rest |
| Real-device testing access | Use own phone + BrowserStack/LambdaTest free tiers or open-source testing programs if eligible; otherwise borrow devices |
