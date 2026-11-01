# Phase 5: PDF Tools

| | |
|---|---|
| **Status** | ✅ Done (2026-11-01, with deferrals below) |
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
- [x] **P5-T03** PDF fixture set: normal, large (300+ pages), encrypted, corrupt, mixed page sizes, AcroForm, XFA, scanned. *Generated in code, no binaries committed (`src/lib/pdf/__fixtures__/pdfs.ts`): `makePdf` (any page count, sizes, rotation; 300 pages in the Organize test), `makeEncryptedPdf`, `makeCorruptPdf`, `makeFormPdf`, `makeXfaPdf`, `makeScannedPdf`; images in `src/lib/files/__fixtures__/images.ts`.*

### Tools (in order)
- [x] **P5-T04** `split-pdf` (spec §3.2): three modes; ZIP output.
- [x] **P5-T05** `organize-pdf` (spec §3.3): uses PageThumbnailGrid; undo/redo; 300-page responsiveness.
- [x] **P5-T06** `jpg-to-pdf` (spec §3.4): page size/orientation/margin; EXIF orientation; non-JPG/PNG re-encoding (uses jSquash; coordinate with P6 codecs).
- [x] **P5-T07** `pdf-to-jpg` (spec §3.5): DPI options; per-device canvas limit with downscale message.
- [x] **P5-T08** `sign-pdf` (spec §3.6): form filling; draw/type/upload signature; text/date/check; drag/resize/keyboard nudge; flatten; visible disclaimer; opt-in "remember signature".
- [x] **P5-T09** Cross-browser/mobile pass; measure memory on iOS Safari with large fixtures; tune limits in registry. — *Automated part done 2026-11-01: the full E2E suite (985 tests) on Playwright Chromium, Firefox, WebKit, Pixel 7 and iPhone 14: 907 passed, 75 skipped (desktop-only or mobile-only cases), 3 failed in Phase 4 developer tools (json-formatter on Firefox, hash-generator on WebKit, url-encode-decode on iPhone) and passed on rerun 3/3 each (load flakes). All PDF tool tests passed on every project. PDF to JPG applies the iOS Safari canvas limit (16,777,216 px) on phones and tablets, tested in the emulated phone projects. **Deferred to P9-T01:** memory on a real iPhone and Android phone with large fixtures, and tuning the limits from it; until then the registry keeps the mvp-scope §4 targets (desktop 100/500 MB, mobile 50/150 MB).*

## Docs to write / update
tool-specifications.md (clarifications, real limits) · mvp-scope.md §4 (validated limits) · browser-device-support.md (device findings)

## Exit criteria
- [x] All 5 tools meet the Definition of Done. *Met with the same deferrals as Phases 3–4: real Android and Safari → P9-T01, screen reader → P9-T06, content review → P8-T04, performance budget → P9-T08 (R-14), offline → Phase 7.*
- [x] Organize PDF stays responsive with a 300-page document on desktop. *E2E (desktop Chromium): 183 ms longest frame gap while scrolling through 300 pages and rotating all of them.*
- [x] Limits in the registry reflect measured device behaviour. *Deferred to P9-T01 (real-device memory); the registry uses the mvp-scope §4 targets meanwhile.*
- [x] Sign-pdf disclaimer visible; XFA shows unsupported message. *E2E: the disclaimer shows before and after a file is chosen; the XFA fixture shows the message and no fields.*

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Fill & Sign UX takes much longer than planned | Ship signature placement + text first; form-field filling right after launch (sign-pdf is P1 priority) |
| iOS memory crashes on large PDFs | Lower mobile limits; sequential page processing; clear guidance to use desktop |
| pdf-lib edge cases (unusual PDFs) | Catch and report `E_CORRUPT` with the file name; collect failing samples for later |
