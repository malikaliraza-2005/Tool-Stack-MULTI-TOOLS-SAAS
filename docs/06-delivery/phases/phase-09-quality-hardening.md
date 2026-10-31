# Phase 9: Quality Hardening

| | |
|---|---|
| **Status** | ⬜ Not started |
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
- [ ] **P9-T01** Full device matrix run: Chrome, Edge, Firefox, Safari (macOS), Safari (iOS, real device), Chrome (mid-range Android, real device). Every tool's main flow + one error flow. The Phase 3 pilots have never run on real Safari: give them the full Definition of Done there (deferred from P3-T24).
- [ ] **P9-T02** Large-file and memory testing on mobile; confirm limits and error messages.
- [ ] **P9-T03** Fix all P0/P1 bugs; log the rest.

### Accessibility
- [ ] **P9-T04** axe on every page (both themes): zero violations.
- [ ] **P9-T05** Manual keyboard-only pass of every tool, including drag-and-drop alternatives.
- [ ] **P9-T06** Screen-reader pass (NVDA on Windows; VoiceOver on iOS for key flows).
- [ ] **P9-T07** 200% zoom and 320px width pass.

### Performance
- [ ] **P9-T08** Switch Lighthouse CI budgets from warn to **enforce**; fix every failure.
- [ ] **P9-T09** Bundle analysis: confirm heavy libraries load only on intent; initial JS within budget on every page.
- [ ] **P9-T10** INP check of heavy interactions (typing in workbench, thumbnail grid, sliders).

### Motion & visual QA
- [ ] **P9-T11** Walk through every page and interaction against design-system §7.4 on the running site (both themes, reduced motion, mid-range phone traces).
- [ ] **P9-T12** Visual consistency pass: token usage, spacing rhythm, empty/error states, copy tone.

### Security & privacy
- [ ] **P9-T13** Security review: CSP verified on production headers; no `dangerouslySetInnerHTML` with user content; malicious file fixtures (malformed PDF, decompression bombs, huge dimensions) handled safely.
- [ ] **P9-T14** Privacy verification: no-network E2E for all 19 tools; localStorage contains no user content; analytics sends no content.
- [ ] **P9-T15** `npm audit` clean (or documented exceptions); license gate green; Licenses page current. Owner decides on `pako` (Zlib): add Zlib to the allow-list or keep the named exception ([dependencies-licenses.md §3.1](../../04-architecture/dependencies-licenses.md)).

### SEO
- [ ] **P9-T16** Crawl the preview (free crawler or custom script): no broken links, correct canonicals, no orphan pages, sitemap complete.
- [ ] **P9-T17** Verify production build will be indexable (no stray `noindex`) and previews are not.

### Launch preparation
- [ ] **P9-T18** Write `06-delivery/launch-checklist.md` and do a dry run.
- [ ] **P9-T19** Write `06-delivery/analytics-monitoring.md`; decide analytics provider (Cloudflare Web Analytics proposed); add its hosts to CSP and Privacy page.

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
