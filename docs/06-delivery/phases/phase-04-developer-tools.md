# Phase 4: Developer Tools

| | |
|---|---|
| **Status** | 🟨 In progress |
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
- [ ] **P4-T03** `url-encode-decode` (spec §5.4) + `url` and `url-encoded` detectors; parser mode.
- [ ] **P4-T04** `uuid-generator` (spec §5.8) + `uuid` detector; v7 implementation per RFC 9562 with tests.
- [ ] **P4-T05** `hash-generator` (spec §5.9); streamed file hashing in a worker; test vectors incl. RFC 4231 HMAC.
- [ ] **P4-T06** `jwt-decoder` (spec §5.2) + `jwt` detector; verification with `jose`; mocked-clock tests.
- [ ] **P4-T07** `diff-checker` (spec §5.5); worker; virtualized output; unified diff export.
- [ ] **P4-T08** `regex-tester` (spec §5.6); dedicated worker with 1000ms timeout; replace mode; explanation (P1 priority within the tool: may follow after launch if time-boxed out).
- [ ] **P4-T09** Detector precedence tests (tool-registry §5) across all detectors.
- [ ] **P4-T10** Cross-browser and mobile pass for all 8 tools; fix issues.
- [ ] **P4-T11** Add any new dependency to the license register (expected: `jose`, `diff`, `hash-wasm`, `ulid`).

## Docs to write / update
tool-specifications.md (clarifications) · dependencies-licenses.md · content drafts for each tool (finalized in P8)

## Exit criteria
- [ ] All 8 tools meet the Definition of Done.
- [ ] All detectors fast (≤ 1ms on 10 KB input) and covered by tests.
- [ ] Regex catastrophic-backtracking test passes with UI responsive.
- [ ] Lighthouse budgets met on every developer tool page.

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Regex explanation takes too long | Ship tester without explanation; add after launch |
| Large diff performance | Lower live-diff threshold; require explicit "Compare" click above a size |
