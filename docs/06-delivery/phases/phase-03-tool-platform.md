# Phase 3: Tool Platform + Pilot Tools

| | |
|---|---|
| **Status** | ✅ Done 2026-10-31 (with owner-approved deferrals to P8/P9, see exit criteria) |
| **Effort** | 7–9 days [Estimate] |
| **Milestone** | M3: Platform proven |

## Goal
Build everything that all tools share (registry, page template, SEO generation, workers, file handling, shared tool UI) and prove it with **two complete pilot tools**: `json-formatter` (text/Workbench) and `merge-pdf` (files/worker). No other tools start until both meet the full Definition of Done.

## Entry criteria
- Phase 2 complete (M2 approved).

## Read first
- [tool-registry.md](../../04-architecture/tool-registry.md)
- [tool-specifications.md §2](../../04-architecture/tool-specifications.md#2-shared-behaviour), §3.1, §5.1
- [architecture.md §5–13](../../04-architecture/architecture.md#5-routes)
- [mvp-scope.md §6 Definition of Done](../../01-product/mvp-scope.md#6-definition-of-done-per-tool)

## Deliverables
- Tool registry with Zod validation and build-time checks.
- `/[tool]` route, ToolPage template, metadata, JSON-LD, sitemap, robots.
- Shared libs: worker runner, files, errors, storage, detectors framework.
- Shared tool UI: Workbench, CodeEditor, DropZone, FileList, ResultPanel, PrivacyMeter.
- `json-formatter` and `merge-pdf` fully done.

## Tasks

### Registry & routing
- [x] **P3-T01** `src/tools/types.ts` + `schema.ts` (Zod) per tool-registry §2.
- [x] **P3-T02** `registry.ts` with validation rules (tool-registry §3) failing the build; unit tests for each rule.
- [x] **P3-T03** `app/[tool]/page.tsx` with `generateStaticParams`, `dynamicParams = false`.
- [x] **P3-T04** ToolPage template: breadcrumbs, H1, tagline, PrivacyMeter slot, workspace shell (static, no layout shift on hydration), content slot, FAQ section, related tools.
- [x] **P3-T05** `ToolLoader` client component lazy-loading each tool's `ui.tsx`.

### SEO generation
- [x] **P3-T06** `lib/seo.ts`: `generateMetadata` (title, description, canonical from `SITE_URL`, OG, Twitter).
- [x] **P3-T07** JSON-LD builders: `BreadcrumbList`, `WebApplication`, `FAQPage` (only with visible FAQs); validate with Rich Results Test on preview. — *Done 2026-10-31. On the preview: one `@graph` per pilot with all three types, 5 FAQ entries matching the 5 visible FAQs; hub links in the breadcrumb 404 until P7-T09 (known, seo-strategy). Rich Results Test (owner, `/merge-pdf` on the preview; json-formatter uses the same builders): Breadcrumbs valid, Software app valid with non-critical warnings; FAQ not listed (Google limits FAQ rich results). The test reports "URL is not available to Google" because previews send `X-Robots-Tag: noindex` (intended, P1-T16); production indexability is P9-T17.*
- [x] **P3-T08** `app/sitemap.ts` and `app/robots.ts` (force-static); verify output files.
- [x] **P3-T09** OG image generation using the approach chosen in P1-T23. — *Done (`app/[tool]/opengraph-image.tsx`); `Content-Type: image/png` confirmed on the Cloudflare preview 2026-10-31.*

### Shared libraries
- [x] **P3-T10** `lib/errors.ts`: `ToolError` codes and message helpers (tool-specifications §2.4).
- [x] **P3-T11** `lib/worker`: `runInWorker` with typed messages, transferables, progress, cancel, timeout; unit tests.
- [x] **P3-T12** `lib/files`: magic-byte sniffing, limit checks (desktop/mobile), reading, download helper (object URL lifecycle), ZIP helper (fflate); unit tests.
- [x] **P3-T13** `lib/storage.ts`: safe, versioned, Zod-validated localStorage; never stores content.
- [x] **P3-T14** `lib/detect`: detector interface + `json` detector (others added with their tools).

### Shared tool UI
- [x] **P3-T15** CodeEditor (CodeMirror 6, themed with tokens, lazy-loaded).
- [x] **P3-T16** Workbench layout (two panes, toolbar, mode switch, actions, sample button, responsive stack).
- [x] **P3-T17** DropZone (all states, keyboard "Choose files", paste support, invalid-type feedback).
- [x] **P3-T18** FileList (thumbnails, sizes, remove, drag + keyboard reorder with Motion layout animation).
- [x] **P3-T19** ResultPanel (summary numbers, primary/secondary actions, result transition).
- [x] **P3-T20** PrivacyMeter (mono readout, links to explanation).
- [x] **P3-T21** Processing state: ProgressBar + Cancel wired to worker cancellation.

### Pilot tools
- [x] **P3-T22** `json-formatter`: meta, logic + tests (spec §5.1 acceptance tests), worker for > 1 MB, UI, content draft, E2E incl. no-network + axe.
- [x] **P3-T23** `merge-pdf`: meta, logic + tests (spec §3.1), worker, UI, content draft, E2E incl. no-network + axe.
- [x] **P3-T24** Test both pilots against the full Definition of Done on Chrome, Firefox, Safari (macOS + iOS), mid-range Android. — *Done 2026-10-31 with one deferral. Playwright Chromium, Firefox, WebKit, Pixel 7 and iPhone 14 pass. Real Android phone (Chrome): full checklist passed by the owner after fixing a 360px overflow in Merge PDF (now guarded by the `noOverflow` E2E fixture). Real Safari (macOS/iOS) is not available to the owner: deferred to P9-T01 (owner decision 2026-10-31).*
- [x] **P3-T25** Retrospective: adjust shared components and the "add a tool" checklist (tool-registry §7) based on what was painful. — *Checklist updated in tool-registry §7 (lessons: hydration race, large text, `import type` for logic).*

## Docs to write / update
security-privacy.md (threat model, CSP, data rules as implemented) · acceptance-criteria.md (release gates per tool/page) · seo-strategy.md (technical SEO as implemented) · tool-registry.md (any schema changes) · tool-specifications.md (clarifications found while building)

## Exit criteria
- [x] Both pilots meet **every** Definition of Done item. *Met with owner-approved deferrals (2026-10-31): DoD 6 performance → P9-T08 (R-14); real Safari → P9-T01; screen-reader check → P9-T06; content review → P8-T04; DoD 4 (offline) → Phase 7. Status per item: [acceptance-criteria.md §3](../../05-quality/acceptance-criteria.md#3-pilot-status-2026-10-31).*
- [x] Registry validation fails the build on a deliberately broken entry (tested). *Unit tests per rule, and a manual `next build` with a broken `related` entry failed (2026-10-14).*
- [x] Generated metadata, canonical, sitemap, robots, and JSON-LD correct on preview; Rich Results Test passes. *Correct in the local production build (`e2e/seo.spec.ts`) and on the preview `p3-mobile-file-picker.sprigkit.pages.dev` (2026-10-31): title, description, canonical and `og:url` on `https://sprigkit.com`, OG image `image/png`, sitemap with all 3 URLs, robots with sitemap, previews `noindex`. Rich Results Test: structured data valid (see P3-T07).*
- [x] No-network E2E passes for both pilots (Chromium, Firefox, WebKit, mobile).
- [x] Lighthouse for both pilot pages meets budgets (architecture §14). *Accepted overrun, deferred to P9-T08 (owner decision 2026-10-31, R-14): Performance 73–84, tool-page JS 267/291 KB vs 120 KB, while the framework + shell baseline alone is 247 KB. A11y, Best Practices, SEO 100. See [performance.md §2.2](../../05-quality/performance.md#22-phase-3-tool-pages).*

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Template doesn't fit both text and file tools | Allow per-tool workspace layouts inside a shared page frame (already allowed by design-system §10) |
| CodeMirror bundle too heavy | Load only needed language packages; lazy-load on first focus |
| Layout shift on hydration | Fixed-size static shell matching the hydrated layout |
