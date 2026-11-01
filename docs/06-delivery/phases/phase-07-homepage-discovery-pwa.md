# Phase 7: Homepage, Discovery & PWA

| | |
|---|---|
| **Status** | 🟨 In progress |
| **Effort** | 5–7 days [Estimate] |
| **Milestone** | M5: Feature-complete (with Phase 8) |

## Goal
Build the distinctive homepage and all the ways users find tools: the instrument hero with drop-zone suggestions and smart paste, category hubs, full command palette, tool-to-tool hand-off, and offline support.

## Entry criteria
- All 19 tools registered (P4–P6 done or nearly done).

## Read first
- [design-system.md §1 and §10.1](../../02-design/design-system.md#101-homepage)
- [mvp-scope.md §3 Global features](../../01-product/mvp-scope.md#3-global-features)
- [tool-registry.md §4–5](../../04-architecture/tool-registry.md#4-what-the-registry-drives)
- [architecture.md §9–10](../../04-architecture/architecture.md#9-state-and-storage)

## Deliverables
Homepage, category hubs, full command palette, smart paste, drop-zone suggestions, hand-off, PWA.

## Tasks

### Homepage
- [x] **P7-T01** Instrument hero: headline, subline, combined command field + drop zone (one surface), subtle static background detail.
- [x] **P7-T02** **Drop-zone suggestions (G-2):** match dropped files to tools via `input.accepts`; animated suggestion list; chosen tool opens with the files (in-memory hand-off).
- [x] **P7-T03** **Smart paste (G-3):** run detectors on paste; open the winning tool pre-filled; tie → small choice list.
- [x] **P7-T04** Privacy proof strip with PrivacyMeter and "How to verify" link.
- [x] **P7-T05** The index: typeset category columns from the registry; keyboard navigable.
- [x] **P7-T06** Popular tools row with mini previews where meaningful.
- [x] **P7-T07** Homepage FAQ (short) and footer links.
- [x] **P7-T08** Choreographed entrance (staggered ≤ 40ms, ≤ 6 items, never blocking input; reduced-motion variant).

### Discovery
- [x] **P7-T09** Category hubs `/pdf-tools`, `/image-tools`, `/developer-tools` (G-8): intro, tool list, short guide links; metadata + JSON-LD.
- [x] **P7-T10** Build script generating `search-index.json` from the registry; CommandPalette with Fuse.js search, Recent, Favorites, actions (theme toggle) (G-1).
- [x] **P7-T11** Favorites and recent tools (G-6) in localStorage.
- [ ] **P7-T12** **Use in another tool (G-11):** ResultPanel hand-off to `handoff` targets, passing output files in memory.

### PWA (G-5)
- [ ] **P7-T13** Serwist (per P1-T22 outcome): precache shell, pages, fonts; runtime-cache on-intent libraries and WASM.
- [ ] **P7-T14** Web app manifest, icons, install prompt behaviour (no nagging).
- [ ] **P7-T15** Offline E2E: visit, go offline, reload a tool, run it successfully.
- [ ] **P7-T16** Update flow: new version available → unobtrusive "Refresh to update" toast.

## Docs to write / update
ui-ux-specification.md (homepage as built) · information-architecture.md · architecture.md (PWA as built)

## Exit criteria
- [ ] Dropping a PDF, an image, and an unsupported file on the homepage each produce the correct result.
- [ ] Pasting a JWT, JSON, timestamp, URL, and Base64 opens the right tool pre-filled.
- [ ] Command palette finds every tool by name and by at least one synonym; fully keyboard operable.
- [ ] Offline E2E passes for at least one tool per category.
- [ ] Homepage meets budgets (≤ 100 KB initial JS gzipped; LCP target).

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Hero with live drop zone hurts LCP | Static hero markup; interactive layer hydrates after; drop zone works with native input first |
| Detector false positives annoy users | Require higher confidence; show suggestion chip instead of auto-opening |
