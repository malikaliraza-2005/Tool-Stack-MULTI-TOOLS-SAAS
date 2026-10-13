# Phase 3: Tool Platform + Pilot Tools

| | |
|---|---|
| **Status** | ⬜ Not started |
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
- [ ] **P3-T01** `src/tools/types.ts` + `schema.ts` (Zod) per tool-registry §2.
- [ ] **P3-T02** `registry.ts` with validation rules (tool-registry §3) failing the build; unit tests for each rule.
- [ ] **P3-T03** `app/[tool]/page.tsx` with `generateStaticParams`, `dynamicParams = false`.
- [ ] **P3-T04** ToolPage template: breadcrumbs, H1, tagline, PrivacyMeter slot, workspace shell (static, no layout shift on hydration), content slot, FAQ section, related tools.
- [ ] **P3-T05** `ToolLoader` client component lazy-loading each tool's `ui.tsx`.

### SEO generation
- [ ] **P3-T06** `lib/seo.ts`: `generateMetadata` (title, description, canonical from `SITE_URL`, OG, Twitter).
- [ ] **P3-T07** JSON-LD builders: `BreadcrumbList`, `WebApplication`, `FAQPage` (only with visible FAQs); validate with Rich Results Test on preview.
- [ ] **P3-T08** `app/sitemap.ts` and `app/robots.ts` (force-static); verify output files.
- [ ] **P3-T09** OG image generation using the approach chosen in P1-T23.

### Shared libraries
- [ ] **P3-T10** `lib/errors.ts`: `ToolError` codes and message helpers (tool-specifications §2.4).
- [ ] **P3-T11** `lib/worker`: `runInWorker` with typed messages, transferables, progress, cancel, timeout; unit tests.
- [ ] **P3-T12** `lib/files`: magic-byte sniffing, limit checks (desktop/mobile), reading, download helper (object URL lifecycle), ZIP helper (fflate); unit tests.
- [ ] **P3-T13** `lib/storage.ts`: safe, versioned, Zod-validated localStorage; never stores content.
- [ ] **P3-T14** `lib/detect`: detector interface + `json` detector (others added with their tools).

### Shared tool UI
- [ ] **P3-T15** CodeEditor (CodeMirror 6, themed with tokens, lazy-loaded).
- [ ] **P3-T16** Workbench layout (two panes, toolbar, mode switch, actions, sample button, responsive stack).
- [ ] **P3-T17** DropZone (all states, keyboard "Choose files", paste support, invalid-type feedback).
- [ ] **P3-T18** FileList (thumbnails, sizes, remove, drag + keyboard reorder with Motion layout animation).
- [ ] **P3-T19** ResultPanel (summary numbers, primary/secondary actions, result transition).
- [ ] **P3-T20** PrivacyMeter (mono readout, links to explanation).
- [ ] **P3-T21** Processing state: ProgressBar + Cancel wired to worker cancellation.

### Pilot tools
- [ ] **P3-T22** `json-formatter`: meta, logic + tests (spec §5.1 acceptance tests), worker for > 1 MB, UI, content draft, E2E incl. no-network + axe.
- [ ] **P3-T23** `merge-pdf`: meta, logic + tests (spec §3.1), worker, UI, content draft, E2E incl. no-network + axe.
- [ ] **P3-T24** Test both pilots against the full Definition of Done on Chrome, Firefox, Safari (macOS + iOS), mid-range Android.
- [ ] **P3-T25** Retrospective: adjust shared components and the "add a tool" checklist (tool-registry §7) based on what was painful.

## Docs to write / update
security-privacy.md (threat model, CSP, data rules as implemented) · acceptance-criteria.md (release gates per tool/page) · seo-strategy.md (technical SEO as implemented) · tool-registry.md (any schema changes) · tool-specifications.md (clarifications found while building)

## Exit criteria
- [ ] Both pilots meet **every** Definition of Done item.
- [ ] Registry validation fails the build on a deliberately broken entry (tested).
- [ ] Generated metadata, canonical, sitemap, robots, and JSON-LD correct on preview; Rich Results Test passes.
- [ ] No-network E2E passes for both pilots.
- [ ] Lighthouse for both pilot pages meets budgets (architecture §14).

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Template doesn't fit both text and file tools | Allow per-tool workspace layouts inside a shared page frame (already allowed by design-system §10) |
| CodeMirror bundle too heavy | Load only needed language packages; lazy-load on first focus |
| Layout shift on hydration | Fixed-size static shell matching the hydrated layout |
