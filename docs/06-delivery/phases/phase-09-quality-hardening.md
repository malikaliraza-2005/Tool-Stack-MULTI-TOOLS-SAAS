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
  - *Progress (2026-11-06):* owner tested the tools on real mobile devices: everything works. Still to do: Safari on macOS and a quick desktop pass in Chrome, Edge and Firefox (CI covers their engines).
- [ ] **P9-T02** Large-file and memory testing on mobile; confirm limits and error messages. From the P8-T04 content review: registry `limits` are not enforced on pasted text in jwt-decoder (64 KB / 1 MB) and regex-tester (1 MB / 10 MB), and json-formatter and base64-encode-decode enforce 50 MB only on opened files. Enforce them or change the registry. Going over a file-count limit (e.g. 101 files in merge-pdf) shows a byte-size message (`src/lib/files/limits.ts`); give it its own message.
  - *Done (code):* `checkTextLimits` enforces the registry hard limit on pasted text in all four tools (UTF-8 bytes); `maxFiles` now has its own `tooManyFiles` message. Mobile large-file and memory testing still to do.
- [ ] **P9-T03** Fix all P0/P1 bugs; log the rest.

### Accessibility
- [x] **P9-T04** axe on every page (both themes): zero violations.
  - *Done:* `e2e/a11y.spec.ts` runs axe on every sitemap page and the 404 page in both themes, in all five Playwright projects (Chromium, Firefox, WebKit, Pixel 7, iPhone 14): zero violations. The tool specs also run axe on their working states.
- [ ] **P9-T05** Manual keyboard-only pass of every tool, including drag-and-drop alternatives.
- [ ] **P9-T06** Screen-reader pass (NVDA on Windows; VoiceOver on iOS for key flows).
- [x] **P9-T07** 200% zoom and 320px width pass.
  - *Done (automated):* `e2e/reflow.spec.ts` loads every sitemap page at 320 px and at 640 px (a 1280 px window at 200% zoom): no horizontal scrolling. Every tool state the E2E tests reach is also checked at phone width (`noOverflow` fixture). A look at real browser zoom is part of the owner's keyboard pass (P9-T05).

### Performance
- [x] **P9-T08** Switch Lighthouse CI budgets from warn to **enforce**; fix every failure.
  - *Done:* owner set the budgets to the measured baseline + noise margin (R-14 closed, architecture §14); `lighthouserc.cjs` now errors; a site page, the guide index and a guide were added (26 URLs). Toasts load on intent (−10 KB on every page). All 78 runs pass ([performance.md §2.3](../../05-quality/performance.md#23-phase-9-enforced-budgets)).
- [x] **P9-T09** Bundle analysis: confirm heavy libraries load only on intent; initial JS within budget on every page.
  - *Done:* no pdf.js, pdf-lib, jSquash, libheif, CodeMirror or WASM request on any page load (Lighthouse network logs, 26 URLs); initial JS 214 KB from HTML on every page (≈ 132 KB framework), within the enforced budgets.
- [x] **P9-T10** INP check of heavy interactions (typing in workbench, thumbnail grid, sliders).
  - *Done:* `npm run e2e:inp` (4× slowed CPU). Fixed: memoized layout-animated indicators and incremental CodeMirror updates (typing 248 → 152–216 ms formatted, 664 → 272–432 ms minified one-line; 300-page grid 224 → 104–160 ms; sliders ≤ 112 ms). Real-phone traces are P9-T11.

### Motion & visual QA
- [ ] **P9-T11** Walk through every page and interaction against design-system §7.4 on the running site (both themes, reduced motion, mid-range phone traces).
  - *Progress:* screenshots of each page type (home, hub, tool, site page, guide, 404) at 1280 px and 390 px in both themes with reduced motion: consistent tokens, spacing and contrast. New E2E check: under reduced motion every CSS animation and transition is instant (home, a tool, guides; all projects); View Transitions are skipped (existing test). Still to do: interaction walk-through against §7.4 and mid-range phone traces on a real device (owner).
- [ ] **P9-T12** Visual consistency pass: token usage, spacing rhythm, empty/error states, copy tone. Includes the owner's second read of the Phase 8 guides and the About, Privacy and Terms pages (content-strategy §4).
  - *Progress:* fixed the 404 copy ("hasn't been built yet" no longer applies with all 19 tools live; content-voice-ux-copy and ui-ux-specification updated). The owner's second read remains.

### Security & privacy
- [ ] **P9-T13** Security review: CSP verified on production headers; no `dangerouslySetInnerHTML` with user content; malicious file fixtures (malformed PDF, decompression bombs, huge dimensions) handled safely.
  - *Progress:* static review: `dangerouslySetInnerHTML` only for the theme and startup scripts (constants) and JSON-LD (escaped by `serializeJsonLd`). Found and fixed: jpg-to-pdf didn't apply the pixel limit, so a small PNG declaring a huge image would be decoded; it now uses `checkPixels` with `MAX_PIXELS` (moved to `src/lib/image/pipeline.ts`), with unit and E2E tests. Hostile PDFs (`src/lib/pdf/hostile.test.ts`): a self-containing page tree fails in 16 ms as damaged, a `/Count` of a billion is ignored, a 200-inch page loads (rendering limits apply), a 512 MB deflate bomb is copied without being inflated, garbage after the header is damaged. Still to do: CSP on production headers (needs the deployment).
  - *Progress (2026-11-06):* headers checked on the live preview (`rename-quietbench.sprigkit.pages.dev`): Content-Security-Policy, Referrer-Policy, X-Content-Type-Options, Permissions-Policy and Cross-Origin-Opener-Policy present; 404 returns 404; `/merge-pdf.html` redirects to `/merge-pdf`; `/_headers` is not served; OG images are `image/png`. Repeat on the production domain at launch.
- [x] **P9-T14** Privacy verification: no-network E2E for all 19 tools; localStorage contains no user content; analytics sends no content.
  - *Progress:* no-network already runs on every E2E test (`noNetwork` fixture). New `noStoredContent` fixture fails any test that leaves a storage key outside the allow-list (theme, tool options, favorites, recent, opt-in signature); stored option schemas hold no content (only flags, time zone, colour). Analytics: none at launch (P9-T19), so nothing to send.
- [x] **P9-T15** `npm audit` clean (or documented exceptions); license gate green; Licenses page current. Owner decides on `pako` (Zlib): add Zlib to the allow-list or keep the named exception ([dependencies-licenses.md §3.1](../../04-architecture/dependencies-licenses.md)).
  - *Decided:* Zlib added to the licence allow-list (pako exception removed); the dev-only `npm audit` findings are documented exceptions (dependencies-licenses.md §3.0). `npm audit --omit=dev`: 0.

### SEO
- [ ] **P9-T16** Crawl the preview (free crawler or custom script): no broken links, correct canonicals, no orphan pages, sitemap complete. Run Google's Rich Results Test and the Schema.org validator on one page of each type (home, hub, tool, site page, guide index, guide), deferred from P3-T07 and P8-T14; `e2e/structured-data.spec.ts` already checks every page locally.
  - *Progress:* `e2e/crawl.spec.ts` crawls the local build from `/`: no broken internal links, canonicals match, no orphan pages. The crawl of the preview and the Rich Results Test remain.
- [ ] **P9-T17** Verify production build will be indexable (no stray `noindex`) and previews are not.
  - *Progress:* only 404, `_not-found` and `_gallery` carry `noindex`; `*.pages.dev` gets `X-Robots-Tag: noindex`. A production build (`CF_PAGES_BRANCH=main`) without an `https://` `NEXT_PUBLIC_SITE_URL` now fails (`next.config.ts`). Check headers on production at launch.
  - *Progress (2026-11-06):* the preview host sends `X-Robots-Tag: noindex` as intended.

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
