# Phase 5: PDF Tools

| | |
|---|---|
| **Status** | 🟨 In progress |
| **Effort** | 8–10 days [Estimate] |

## Goal
Build the remaining 5 PDF tools. These are the main organic-search pillar, so interaction quality (page thumbnails, drag-to-reorder, signing) matters most here.

## Entry criteria
- Phase 3 complete. (Phase 4 may still be finishing.)

## Read first
- [tool-specifications.md §2 and §3](../../04-architecture/tool-specifications.md#3-pdf-tools)
- [design-system.md §10.4 File workspace](../../02-design/design-system.md#104-file-workspace-pdf-tools)

## Deliverables
5 tools meeting the Definition of Done, plus two shared components: **PageThumbnailGrid** and the **page-range parser**.

## Tasks

### Shared
- [x] **P5-T01** Page-range parser (`1-3, 5, 8-`) with full unit tests (spec §3.2); shared by split-pdf and pdf-to-jpg.
- [x] **P5-T02** PageThumbnailGrid: virtualized, lazy pdf.js thumbnail rendering in a worker, drag + keyboard reorder, multi-select, rotate/delete actions, undo/redo stack.
- [ ] **P5-T03** PDF fixture set: normal, large (300+ pages), encrypted, corrupt, mixed page sizes, AcroForm, XFA, scanned.

### Tools (in order)
- [x] **P5-T04** `split-pdf` (spec §3.2): three modes; ZIP output.
- [x] **P5-T05** `organize-pdf` (spec §3.3): uses PageThumbnailGrid; undo/redo; 300-page responsiveness.
- [ ] **P5-T06** `jpg-to-pdf` (spec §3.4): page size/orientation/margin; EXIF orientation; non-JPG/PNG re-encoding (uses jSquash; coordinate with P6 codecs).
- [ ] **P5-T07** `pdf-to-jpg` (spec §3.5): DPI options; per-device canvas limit with downscale message.
- [ ] **P5-T08** `sign-pdf` (spec §3.6): form filling; draw/type/upload signature; text/date/check; drag/resize/keyboard nudge; flatten; visible disclaimer; opt-in "remember signature".
- [ ] **P5-T09** Cross-browser/mobile pass; measure memory on iOS Safari with large fixtures; tune limits in registry.

## Docs to write / update
tool-specifications.md (clarifications, real limits) · mvp-scope.md §4 (validated limits) · browser-device-support.md (device findings)

## Exit criteria
- [ ] All 5 tools meet the Definition of Done.
- [x] Organize PDF stays responsive with a 300-page document on desktop. *E2E (desktop Chromium): 183 ms longest frame gap while scrolling through 300 pages and rotating all of them.*
- [ ] Limits in the registry reflect measured device behaviour.
- [ ] Sign-pdf disclaimer visible; XFA shows unsupported message.

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Fill & Sign UX takes much longer than planned | Ship signature placement + text first; form-field filling right after launch (sign-pdf is P1 priority) |
| iOS memory crashes on large PDFs | Lower mobile limits; sequential page processing; clear guidance to use desktop |
| pdf-lib edge cases (unusual PDFs) | Catch and report `E_CORRUPT` with the file name; collect failing samples for later |
