# Phase 0: Validation & Decisions

| | |
|---|---|
| **Status** | ✅ Done (2026-10-13). P0-T05 is carried over as a manual step |
| **Effort** | 2–3 days [Estimate] |
| **Milestone** | M0: Decisions closed |

## Goal
Close the open decisions and check the tool list and URLs against free demand data **before** any code depends on them. Slugs become permanent once indexed, so they must be right now.

## Entry criteria
- Core docs written ([product.md](../../01-product/product.md), [mvp-scope.md](../../01-product/mvp-scope.md)).

## Read first
- [product.md §13 Decisions](../../01-product/product.md#13-decisions)
- [mvp-scope.md §2](../../01-product/mvp-scope.md#2-mvp-tools-19)
- [dependencies-licenses.md §4](../../04-architecture/dependencies-licenses.md#4-under-review)

## Deliverables
- Final decisions for D-1 (domain), D-5 (name), D-6 (HEIC).
- Validated tool list and **final slugs**.
- Keyword research notes per tool (no invented numbers).
- Decision log started.

## Tasks

### Decisions
- [x] **P0-T01** Name check for "ToolStack": search existing products and companies, trademark databases (USPTO TESS/WIPO Global Brand Database, free), app stores, GitHub; record findings. → Collision found: toolstack.tools is the same product under the same name. Trademark registers could not be queried automatically (owner to check manually). See [risks-and-decisions.md](../risks-and-decisions.md) D-5.
- [x] **P0-T02** If the name collides, shortlist 3–5 alternatives and check each the same way; choose one. → Shortlist of 5 checked; **Sprigkit** chosen (D-5).
- [x] **P0-T03** Domain decision (D-1): check availability of preferred domains; decide domain vs free `*.pages.dev`. Record cost if buying. → `sprigkit.com` unregistered on 2026-10-13 (RDAP); decision: buy it (D-1). Owner to register and record the price.
- [x] **P0-T04** HEIC decision (D-6): read the libheif/`heic-to` LICENSE files; decide ship-with-LGPL-compliance or launch without HEIC. → LICENSE files read; ship HEIC via `libheif-js` under LGPL-3.0 conditions (D-6).

### Demand validation (free sources only)
- [ ] **P0-T05** For each of the 19 tools, compare candidate phrasings in **Google Trends** (e.g. "jpg to pdf" vs "image to pdf"; "jwt decoder" vs "jwt decode"). → **Not done: Google Trends returned HTTP 429 to automated requests.** Manual check listed in [keyword-research.md](../../03-seo-growth/keyword-research.md) §5; must happen before the first production deploy.
- [x] **P0-T06** Collect long-tail questions per tool from Google autocomplete, "People also ask", and relevant forum threads. These become FAQ candidates. → Google + Bing autocomplete collected 2026-10-13; question-form suggestions are the FAQ candidates ([keyword-research.md](../../03-seo-growth/keyword-research.md) §3). Real "People also ask" boxes not collected (manual, Phase 8).
- [ ] **P0-T07** Optional: Google Keyword Planner ranges (free account) and Bing Webmaster Tools keyword research. Record ranges as given; do not convert them to exact numbers. → Skipped (optional; needs signed-in accounts).
- [x] **P0-T08** Note the top-ranking pages per primary query and what they do poorly (qualitative), as input to differentiation and content. → Qualitative, from a generic search tool, not Google (see [competitor-research.md](../../01-product/competitor-research.md)).
- [x] **P0-T09** Decide **final slugs** (one intent per page). Update [mvp-scope.md](../../01-product/mvp-scope.md) and [tool-registry.md](../../04-architecture/tool-registry.md) §8 if any change. → 4 renamed, 15 kept (D-11); applied across all docs.
- [x] **P0-T10** Flag any tool with clearly weak demand; propose a swap from Tier 2 if justified (scope change process). → None clearly weak; no swap. Watch list: hash-generator, uuid-generator, organize-pdf ([keyword-research.md](../../03-seo-growth/keyword-research.md) §4.2).

### Records
- [x] **P0-T11** Create `06-delivery/risks-and-decisions.md`: decision log (ADR-style) + risk register; move the decisions table from product.md into it. → Created; decisions and risks moved out of product.md.
- [x] **P0-T12** Write `03-seo-growth/keyword-research.md` (findings per tool, sources, dates). → Written.
- [x] **P0-T13** Write `01-product/competitor-research.md` (main competitors per pillar, strengths, weaknesses, our angle). → Written.
- [x] **P0-T14** Write `01-product/requirements.md` only if needed (functional/non-functional list consolidated from product.md, mvp-scope.md, specs); otherwise mark it "merged into existing docs" in docs/README.md. → Not needed; marked "merged into existing docs" (D-12).

## Docs to write / update
keyword-research.md · competitor-research.md · risks-and-decisions.md · requirements.md (or drop) · product.md · mvp-scope.md · tool-registry.md (slugs)

## Exit criteria
- [x] D-1, D-5, D-6 decided and recorded.
- [x] All 19 slugs final and consistent across mvp-scope, tool-registry, and tool-specifications.
- [x] Keyword research doc exists with sources; no invented metrics.
- [x] Decision log exists.

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Free tools give little data | Rely on Trends comparisons + autocomplete + competitor URL patterns; decide and move on |
| Name collision | Pick an alternative now; renaming after launch is far more costly |
| Preferred domain taken | Choose a different name/domain pair together |
