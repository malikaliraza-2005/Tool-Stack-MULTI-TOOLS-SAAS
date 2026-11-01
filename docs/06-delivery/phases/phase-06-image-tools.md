# Phase 6: Image Tools

| | |
|---|---|
| **Status** | 🟡 In progress |
| **Effort** | 6–8 days [Estimate] |
| **Milestone** | M4: All 19 tools (when this phase and P4/P5 are done) |

## Goal
Build the 4 image tools on a shared codec pipeline, with the ComparisonSlider as the signature interaction and `remove-exif-data` as the clearest expression of the privacy promise.

## Entry criteria
- Phase 3 complete; jSquash approach proven in P1-T19.

## Read first
- [tool-specifications.md §2 and §4](../../04-architecture/tool-specifications.md#4-image-tools)
- [design-system.md §10.5 Comparison](../../02-design/design-system.md#105-comparison-image-tools)
- HEIC decision (D-6) in the decision log

## Deliverables
4 tools meeting the Definition of Done; shared **image pipeline** (decode → orient → transform → encode in a worker) and **ComparisonSlider**.

## Tasks

### Shared
- [x] **P6-T01** Image pipeline worker: decode (jSquash per format / `createImageBitmap`), apply EXIF orientation, optional resize, encode; batch with concurrency 2; progress; cancel.
- [x] **P6-T02** ComparisonSlider (drag + keyboard, sizes shown, works with large images via downscaled previews). *Used by compress, resize and convert; previews above 16 MP come from the worker (a 40 MP photo is E2E-tested).*
- [x] **P6-T03** Batch list UI with per-file status and totals; "Download all (ZIP)".
- [x] **P6-T04** Image fixture set: EXIF-rotated JPEG, GPS JPEG, transparent PNG, animated GIF, large (40+ MP), WebP with EXIF/XMP, AVIF, HEIC (if D-6 approved). *Done so far (generated in `src/lib/files/__fixtures__/images.ts`):* EXIF-rotated and GPS JPEG (with XMP, IPTC, comment, trailer), transparent PNG and PNG with metadata, animated GIF, WebP with EXIF/XMP, AVIF. *Added later in Phase 6:* 40 MP JPEG (drawn in the browser in `e2e/tools/compress-image.spec.ts`), HEIC with and without alpha (from libheif's test corpus), GIF and BMP generators.

### Tools (in order)
- [x] **P6-T05** `remove-exif-data` (spec §4.4): inspect view (GPS first, text coordinates only), lossless JPEG/PNG/WebP stripping, orientation handling.
- [x] **P6-T06** `compress-image` (spec §4.1): quality, format, "keep original if larger" rule.
- [x] **P6-T07** `resize-image` (spec §4.3): resize + crop modes, aspect presets, "don't enlarge".
- [x] **P6-T08** `convert-image` (spec §4.2): format matrix, alpha → background, GIF first frame; HEIC per D-6.
- [x] **P6-T09** If HEIC ships: separate, unmodified LGPL decoder file + license notice + source link (dependencies-licenses §4).
- [ ] **P6-T10** Cross-browser/mobile pass; AVIF encode timing on low-end devices (show estimate/warning if slow); tune limits.
- [x] **P6-T11** Connect `jpg-to-pdf` (P5) to the shared image pipeline if not already.

## Docs to write / update
tool-specifications.md · dependencies-licenses.md (codec upstream licenses confirmed) · mvp-scope.md §4 limits · browser-device-support.md

## Exit criteria
- [ ] All 4 tools meet the Definition of Done.
- [ ] Remove-EXIF verified by re-reading outputs (no GPS) in tests.
- [ ] Codec upstream licenses recorded.
- [ ] **M4:** all 19 tools done (with P4 and P5).

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| AVIF encoding too slow on phones | Default to WebP on mobile; AVIF available with a "slower" label |
| Very large images exceed canvas limits | Decode with WASM codecs instead of canvas; enforce limits with clear message |
| HEIC license review fails | Launch without HEIC; show "coming soon" note on convert-image |
