# Implementation Roadmap

| | |
|---|---|
| **Last updated** | 2026-10-13 |
| **Pace assumption** | Full-time, no weekly hour limit (D-3) |
| **Phase details** | [phases/](phases/README.md) |
| **Related** | [mvp-scope.md](../01-product/mvp-scope.md) · [architecture.md](../04-architecture/architecture.md) · [design-system.md](../02-design/design-system.md) |

This is the master plan for building and launching the Sprigkit MVP (19 tools). Each phase has its own file with a task checklist, exit criteria, and risks. **Quality gates, not dates, decide when a phase is finished.**

---

## 1. Working principles

1. **Risk first.** Unknowns (WASM loading, PDF worker, offline support, CSP with static export) are tested in throwaway spikes in Phase 1, before anything depends on them.
2. **Prove the platform with pilots.** Phase 3 builds one developer tool (`json-formatter`) and one file tool (`merge-pdf`) end to end. Only when both meet the Definition of Done do we build the other 17.
3. **Vertical slices.** Each tool is finished completely (logic, tests, UI, motion, accessibility, metadata, content draft) before the next starts. No half-built tools.
4. **Always deployable.** Every phase ends with a working Cloudflare **preview** deployment (never indexed). `main` stays green.
5. **Design is verified on the running site,** not in code or screenshots: both themes, mobile width, keyboard only, reduced motion.
6. **Docs move with code.** If implementation changes a decision, the relevant document is updated in the same change.
7. **Scope is fixed.** New ideas go to the Tier 2 backlog ([mvp-scope.md](../01-product/mvp-scope.md) §5) unless the scope document is formally changed.

---

## 2. Phases

| # | Phase | Main outcome | Effort **[Estimate]** | File |
|---|---|---|---|---|
| 0 | Validation & decisions | Open decisions closed; tool list and slugs validated with free data | 2–3 days | [phase-00](phases/phase-00-validation-decisions.md) |
| 1 | Setup & technical spikes | Project scaffolded, CI and preview deploys working, risky tech proven | 3–5 days | [phase-01](phases/phase-01-setup-and-spikes.md) |
| 2 | Design system & app shell | Tokens, components, motion system, layout, theme, component gallery | 6–8 days | [phase-02](phases/phase-02-design-system-and-shell.md) |
| 3 | Tool platform + pilots | Registry, tool page template, SEO generation, workers, shared tool UI; `json-formatter` and `merge-pdf` done | 7–9 days | [phase-03](phases/phase-03-tool-platform.md) |
| 4 | Developer tools | 8 remaining developer tools | 6–8 days | [phase-04](phases/phase-04-developer-tools.md) |
| 5 | PDF tools | 5 remaining PDF tools | 8–10 days | [phase-05](phases/phase-05-pdf-tools.md) |
| 6 | Image tools | 4 image tools | 6–8 days | [phase-06](phases/phase-06-image-tools.md) |
| 7 | Homepage, discovery & PWA | Instrument hero, drop-zone suggestions, smart paste, hubs, command palette, hand-off, offline | 5–7 days | [phase-07](phases/phase-07-homepage-discovery-pwa.md) |
| 8 | Content, SEO & legal | Supporting content for all tools, page SEO specs, About/Privacy/Terms/Licenses, first guides | 6–8 days (overlaps 4–7) | [phase-08](phases/phase-08-content-seo-legal.md) |
| 9 | Quality hardening | Device matrix, accessibility audit, performance, motion QA, security review | 5–7 days | [phase-09](phases/phase-09-quality-hardening.md) |
| 10 | Launch | Production, Search Console/Bing, analytics, community launch | 2–3 days | [phase-10](phases/phase-10-launch.md) |
| 11 | Post-launch iteration | Monthly review loop, fixes, Tier 2 by data | Ongoing | [phase-11](phases/phase-11-post-launch.md) |

**Total to launch:** ≈ 56–76 working days, about **12–15 weeks full-time** **[Estimate]**. AI-assisted coding may shorten implementation phases; quality hardening and content review rarely shrink.

---

## 3. Dependencies and critical path

```
P0 Validation ──► P1 Setup & spikes ──► P2 Design system ──► P3 Platform + pilots ─┬─► P4 Developer tools ─┐
                                                                                   ├─► P5 PDF tools ───────┼─► P7 Homepage/PWA ─► P9 Hardening ─► P10 Launch ─► P11 Iterate
                                                                                   └─► P6 Image tools ─────┘        ▲
                                                           P8 Content, SEO & legal (starts after P3, runs alongside P4–P7) ┘
```

- **Critical path:** P0 → P1 → P2 → P3 → (P4, P5, P6) → P7 → P9 → P10.
- P4, P5, and P6 are independent of each other once P3 is done. Recommended order: **P4 → P5 → P6**. Developer tools are fastest and reuse the Workbench; PDF tools come next because they're the main search pillar.
- P8 content for each tool is drafted as that tool is built and finalized in P8.
- P7 needs all tools registered (drop-zone and smart-paste suggestions point to them).

---

## 4. Milestones

| Milestone | At end of | Evidence |
|---|---|---|
| **M0** Decisions closed | P0 | Decision log updated; final slug list |
| **M1** Pipeline live | P1 | Preview URL from a push; CI green; spikes documented |
| **M2** Design system approved | P2 | Component gallery reviewed on the running site in both themes, mobile, keyboard, reduced motion |
| **M3** Platform proven | P3 | `json-formatter` and `merge-pdf` meet the full Definition of Done |
| **M4** All 19 tools | P6 | Every tool meets the Definition of Done |
| **M5** Feature-complete | P7 + P8 | Homepage, discovery, PWA, all content and legal pages |
| **M6** Launch-ready | P9 | All release gates pass |
| **M7** Launched | P10 | Production live, sitemaps submitted, launch posts published |

---

## 5. Where each feature is built

### 5.1 Tools (19)

| Phase | Tools |
|---|---|
| P3 (pilots) | `json-formatter`, `merge-pdf` |
| P4 | `jwt-decoder`, `base64-encode-decode`, `url-encode-decode`, `diff-checker`, `regex-tester`, `unix-timestamp-converter`, `uuid-generator`, `hash-generator` |
| P5 | `split-pdf`, `organize-pdf`, `jpg-to-pdf`, `pdf-to-jpg`, `sign-pdf` |
| P6 | `compress-image`, `convert-image`, `resize-image`, `remove-exif-data` |

### 5.2 Global features ([mvp-scope.md](../01-product/mvp-scope.md) §3)

| Feature | Phase |
|---|---|
| G-1 Command palette | P2 (component), P7 (full search) |
| G-2 Homepage drop zone | P7 |
| G-3 Smart paste | P7 (detectors built with their tools in P3/P4) |
| G-4 PrivacyMeter + CSP | P1 (CSP), P3 (component) |
| G-5 Offline / PWA | P1 (spike), P7 (ship) |
| G-6 Local preferences | P2 (theme), P3 (storage lib, tool options) |
| G-7 Theme switching | P2 |
| G-8 Category hubs and index | P7 |
| G-9 Privacy page | P8 |
| G-10 About page | P8 |
| G-11 Use in another tool | P7 |

---

## 6. Documentation written along the way

The 29 planned documents in [docs/README.md](../README.md) are written when their knowledge is fresh, not all upfront.

| Phase | Documents |
|---|---|
| P0 | `03-seo-growth/keyword-research.md`, `01-product/competitor-research.md`, `06-delivery/risks-and-decisions.md` (start the decision log), `01-product/requirements.md` |
| P1 | `05-quality/testing-strategy.md`, `04-architecture/coding-standards.md`, `06-delivery/deployment.md`, `05-quality/performance.md`, `05-quality/browser-device-support.md` (initial matrix) |
| P2 | `02-design/brand-identity.md`, `02-design/motion-design.md`, `02-design/accessibility.md`, `02-design/ui-ux-specification.md`, `02-design/information-architecture.md`, `02-design/content-voice-ux-copy.md` |
| P3 | `04-architecture/security-privacy.md`, `05-quality/acceptance-criteria.md`, `03-seo-growth/seo-strategy.md` |
| P8 | `03-seo-growth/page-seo-specs.md`, `03-seo-growth/content-strategy.md`, `03-seo-growth/geo-strategy.md`, `07-legal/privacy-policy.md`, `07-legal/terms-of-use.md` |
| P9 | `06-delivery/launch-checklist.md`, `06-delivery/analytics-monitoring.md` |
| P11 | `06-delivery/maintenance.md`, `03-seo-growth/monetization.md` |

Each document stays short and practical. If a document isn't needed in its phase, it moves to a later phase or is dropped.

---

## 7. Tracking progress

- Each phase file has a task checklist with IDs `P<phase>-T<nn>` (e.g. `P3-T07`). Tick tasks in the file as they're completed.
- [phases/README.md](phases/README.md) holds the status of every phase: ⬜ Not started · 🟨 In progress · ✅ Done · ⏸ Blocked.
- [CLAUDE.md](../../CLAUDE.md) names the **current phase**, so every AI coding session starts from the right checklist.
- Commits reference task IDs (e.g. `P3-T07: add ToolPage template`).
- A phase is ✅ only when **all exit criteria** in its file pass, verified on a preview deployment.

---

## 8. Estimate assumptions

- One developer, full-time, using AI coding assistance.
- Effort figures are **[Estimate]** working days, ±30%. They exclude waiting time (e.g. search engine indexing).
- Biggest uncertainties: WASM/worker bundling (P1 spikes), Fill & Sign UX (P5), mobile memory limits (P5/P6/P9).
- If a phase overruns by more than 50%, stop and re-plan: reduce scope (move P1 tools to after launch) before cutting quality.

---

## 9. Changing the plan

1. Edit the affected phase file(s) and this roadmap.
2. Record the reason in `06-delivery/risks-and-decisions.md`.
3. If scope changes, update [mvp-scope.md](../01-product/mvp-scope.md) first.
