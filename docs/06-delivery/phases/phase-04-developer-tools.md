# Phase 4: Developer Tools

| | |
|---|---|
| **Status** | ✅ Done 2026-11-01 (with owner-approved deferrals to P7–P9, see exit criteria) |
| **Effort** | 6–8 days [Estimate] |

## Goal
Build the remaining 8 developer tools on the proven Workbench, each fully meeting the Definition of Done.

## Entry criteria
- Phase 3 complete (M3).

## Read first
- [tool-specifications.md §2 and §5](../../04-architecture/tool-specifications.md#5-developer-tools)
- [tool-registry.md §5 (detectors) and §7 (add a tool)](../../04-architecture/tool-registry.md#7-adding-a-new-tool-checklist)

## Deliverables
8 tools, each with: `meta.ts`, `logic.ts` + unit tests, worker (where specified), `ui.tsx`, `content.tsx` draft, E2E test (no-network + axe), smart-paste detector where listed.

## Tasks

Build in this order (simplest first, building momentum and reusable pieces):

- [x] **P4-T01** `unix-timestamp-converter` (spec §5.7) + `unix-timestamp` detector.
- [x] **P4-T02** `base64-encode-decode` (spec §5.3) + `base64` detector; file mode with magic-byte type detection.
- [x] **P4-T03** `url-encode-decode` (spec §5.4) + `url` and `url-encoded` detectors; parser mode.
- [x] **P4-T04** `uuid-generator` (spec §5.8) + `uuid` detector; v7 implementation per RFC 9562 with tests.
- [x] **P4-T05** `hash-generator` (spec §5.9); streamed file hashing in a worker; test vectors incl. RFC 4231 HMAC.
- [x] **P4-T06** `jwt-decoder` (spec §5.2) + `jwt` detector; verification with `jose`; mocked-clock tests.
- [x] **P4-T07** `diff-checker` (spec §5.5); worker; virtualized output; unified diff export.
- [x] **P4-T08** `regex-tester` (spec §5.6); dedicated worker with 1000ms timeout; replace mode; explanation (P1 priority within the tool: may follow after launch if time-boxed out).
- [x] **P4-T09** Detector precedence tests (tool-registry §5) across all detectors.
- [x] **P4-T10** Cross-browser and mobile pass for all 8 tools; fix issues. — *Automated part done 2026-10-31: the full E2E suite (705 tests, 2 workers) on Playwright Chromium, Firefox, WebKit, Pixel 7 and iPhone 14 passed apart from load flakes that pass on rerun (12/12) and a WebKit crash in the theme View Transition (below). Fixed along the way: focus loss when CodeEditor upgrades (also JSON Formatter), typing before hydration lost in plain inputs, mode labels not updating in CodeMirror, Firefox CodeMirror `fill` in tests, phone layout of the diff view. **Deferred to P9-T01 (owner decision 2026-11-01):** a real Android phone and real Safari (macOS/iOS). **Found:** Playwright's Windows WebKit crashes when the theme switch runs as a View Transition on longer pages (every tool page, 5/5; never under reduced motion). It's Phase 2 code; real Safari must be checked in P9-T01. The shell theme test runs WebKit with reduced motion meanwhile.*
- [x] **P4-T11** Add any new dependency to the license register (expected: `jose`, `diff`, `hash-wasm`, `ulid`).

## Docs to write / update
tool-specifications.md (clarifications) · dependencies-licenses.md · content drafts for each tool (finalized in P8)

## Exit criteria
- [x] All 8 tools meet the Definition of Done. *Met with owner-approved deferrals (2026-11-01), the same as the Phase 3 pilots: real Android and Safari → P9-T01, screen-reader check → P9-T06, content review → P8-T04, performance budget → P9-T08 (R-14), offline (DoD 4) → Phase 7.*
- [x] All detectors fast (≤ 1ms on 10 KB input) and covered by tests. *`src/lib/detect/detect.test.ts`: precedence for realistic pastes and every detector on six kinds of 10 KB input.*
- [x] Regex catastrophic-backtracking test passes with UI responsive. *`(a+)+$` is stopped after 1 s; longest main-thread frame gap 17 ms.*
- [x] Lighthouse budgets met on every developer tool page. *Measured 2026-10-31 (local, warn-only) on all 8 tool pages: Accessibility, Best Practices, SEO 100; Performance 73–83; CLS ≤ 0.001; tool-page JS 262–301 KB vs the 120 KB budget, the same overrun as the pilots (R-14). Under load, Lighthouse's trace fails intermittently with NO_NAVSTART on this machine; diff-checker and regex-tester were measured in a separate run. **Deferred to P9-T08** (owner decision 2026-11-01, R-14).*

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Regex explanation takes too long | Ship tester without explanation; add after launch |
| Large diff performance | Lower live-diff threshold; require explicit "Compare" click above a size |
