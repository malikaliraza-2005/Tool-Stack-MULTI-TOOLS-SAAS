# Risks & Decisions

| | |
|---|---|
| **Last updated** | 2026-10-13 |
| **Related** | [product.md](../01-product/product.md) · [mvp-scope.md](../01-product/mvp-scope.md) · [implementation-roadmap.md](implementation-roadmap.md) |

This file is the **decision log** and **risk register** for Sprigkit. It replaces the decisions table formerly in [product.md §13](../01-product/product.md#13-decisions) and the risks table formerly in product.md §12.

**Rules**
- A decision is recorded here when it is made or changed. Update the affected documents **in the same change**.
- Decisions are never deleted. A reversed decision is marked **Superseded by D-n** and a new record is added.
- Statuses: **[Decision]** agreed and binding · **[Open]** undecided · **Superseded**.

---

## 1. Decision index

| # | Decision | Status | Outcome | Date |
|---|---|---|---|---|
| D-1 | Domain vs free `*.pages.dev` | **[Decision]** | Buy **`sprigkit.com`** before launch (see record) | 2026-10-13 |
| D-2 | Framework | **[Decision]** | Next.js static export (see [architecture.md](../04-architecture/architecture.md)) | 2026-10-13 |
| D-3 | Weekly hours available | **[Decision]** | No limit: full-time pace (see [implementation-roadmap.md](implementation-roadmap.md)) | 2026-10-13 |
| D-4 | Launch order | **[Decision]** | All tools together; file tools lead | 2026-10-13 |
| D-5 | Product name | **[Decision]** | **Sprigkit** replaces the working name "ToolStack" (see record) | 2026-10-13 |
| D-6 | HEIC support (LGPL decoder) | **[Decision]** | **Ship HEIC** with `libheif-js` under LGPL-3.0 compliance conditions (see record) | 2026-10-13 |
| D-7 | AI crawlers in robots.txt | **[Decision]** (proposed) | Allow | 2026-10-13 |
| D-8 | Audience | **[Decision]** | Both pillars; file tools lead search, developer tools lead community | 2026-10-13 |
| D-9 | Database | **[Decision]** | None for MVP | 2026-10-13 |
| D-10 | Hosting | **[Decision]** | Cloudflare (static) | 2026-10-13 |
| D-11 | Final MVP slugs | **[Decision]** | 4 renamed: `jpg-to-pdf`, `pdf-to-jpg`, `base64-encode-decode`, `url-encode-decode`; 15 unchanged (see record) | 2026-10-13 |
| D-12 | `requirements.md` | **[Decision]** | Not written; requirements live in product.md, mvp-scope.md, tool-specifications.md and architecture.md | 2026-10-13 |
| D-13 | Repository visibility and license (P1-T01) | **[Decision]** (proposed, owner to confirm) | Public GitHub repo, **all rights reserved** (no open-source license) (see record) | 2026-10-13 |
| D-14 | Bundler for dev and production builds | **[Decision]** | **Webpack** (`--webpack`), not Turbopack: Turbopack workers fail in WebKit (see record) | 2026-10-13 |

D-2 to D-4 and D-7 to D-10 were made before Phase 0 and are summarized above; their reasoning lives in the linked documents.

---

## 2. Decision records

### D-1: Domain

- **Status:** [Decision] 2026-10-13, made by the product owner.
- **Context:**
  - The site can launch on a free `*.pages.dev` subdomain or an owned domain. The whole site reads a single `SITE_URL` setting.
  - Moving domains after indexing loses ranking progress.
  - AdSense, a later option (see [product.md §9](../01-product/product.md#9-monetization-roadmap)), requires an owned domain.
- **Options:**
  1. `*.pages.dev`: $0.
  2. Buy `.com`: about $10–12/year **[Estimate]**.
  3. Buy `.app`.
- **Decision:** buy **`sprigkit.com`** and launch on it.
  - `sprigkit.com` was **not registered** on 2026-10-13: RDAP `rdap.verisign.com` returned 404 **[Verified 2026-10-13]**.
  - `sprigkit.app` and `sprigkit.dev` were also unregistered (rdap.org 404).
- **Consequences:**
  - This is the project's only recurring cost. Record the actual price and registrar here once bought.
  - Set `NEXT_PUBLIC_SITE_URL=https://sprigkit.com`.
  - **Action (owner):** register the domain soon; availability can change at any time. A shortlisted alternative `.com` was registered by someone else in July 2026.
  - Optional: also register `sprigkit.app` to protect the name.

| Purchase record | |
|---|---|
| Registrar | *(fill in)* |
| Date | *(fill in)* |
| Price / year | *(fill in)* |

### D-5: Product name

- **Status:** [Decision] 2026-10-13, made by the product owner.
- **Context:**
  - P0-T01 name check for the working name "ToolStack" (2026-10-13):
    - **toolstack.tools** is a live site called "Toolstack – Free, Fast & Private Online Developer Utilities". It describes itself as tools "running locally in your browser", covering PDF compression, image resizing, Base64, HEIC→JPG, JWT, hash and UUID **[Verified 2026-10-13]**. That is the same product concept under the same name.
    - Also present: a "ToolStack" on Product Hunt (free online tools), DevToolStack (client-side dev tools), toolstack.io (tool directory), toolstack.app (iOS utilities), a "ToolStack" iOS app (tool inventory), and GitHub user `toolstack`.
    - `toolstack.com`, `.io`, `.app`, `.dev` and `.tools` are all registered.
    - "toolstack" is also a generic term (Xen/XCP), which would hurt brand search.
- **Options (P0-T02):** shortlist checked by web search, GitHub and RDAP on 2026-10-13.

  | Name | .com | .app / .dev | Existing use found |
  |---|---|---|---|
  | **Sprigkit** | unregistered | unregistered | None exact. Sound-alikes: SprüKits (toys), SpriteKit (Apple framework) |
  | Toolkeel | unregistered | unregistered | None |
  | Kitlantern | unregistered | unregistered | None |
  | Kitbench | registered | unregistered | None |
  | Tooltrove | registered | unregistered | GitHub user `tooltrove`; crowded similar names |

- **Decision:** **Sprigkit**. All documents were renamed in the same change. "ToolStack" now appears only as history: the Phase 0 task text, this log, and the product.md decision summary.
- **Consequences / open checks (owner, before brand work in Phase 2):**
  - [ ] Trademark search for "SPRIGKIT" in classes 9 and 42: USPTO (tmsearch.uspto.gov), WIPO Global Brand Database, EUIPO eSearch. Could not be done automatically: the registers block scripted access.
  - [ ] Direct search of Google Play and the Chrome Web Store.
  - [ ] Register the domain (D-1) and reserve the GitHub org and social handles if wanted.
  - If a trademark conflict appears, return to the shortlist above and record a superseding decision. Renaming is cheap until the first production deploy.

### D-6: HEIC support

- **Status:** [Decision] 2026-10-13.
- **Context:**
  - HEIC→JPG has strong demand and privacy-related intent (see [keyword-research.md](../03-seo-growth/keyword-research.md)).
  - All browser HEIC decoders found wrap **libheif**, which is LGPL-3.0.
- **Review (P0-T04)**: package contents read on 2026-10-13 **[Verified]**:
  - `libheif-js` 1.23.5 (npm, catdad-experiments):
    - `package.json` license is `LGPL-3.0`.
    - `LICENSE` is the LGPL-3.0 text.
    - `libheif-wasm/LICENSE` states: "The library `libheif` is distributed under the terms of the GNU Lesser General Public License. The sample applications and the Go and C++ wrappers are distributed under the terms of the MIT License." It includes the LGPL-3.0 text and the GPL-3.0 text, which LGPL-3.0 incorporates by reference.
  - HEVC decoding comes from **libde265**. Its README says: "The library `libde265` is distributed under the terms of the GNU Lesser General Public License".
  - **x265 (GPL) is not present.** The WASM binary was searched for codec names: `libde265` appears, `x265` does not.
    - `dav1d`, `openjpeg` and `vvdec` names also appear (possibly plugin registry strings).
    - Their upstream licenses are permissive **[Unverified]**: dav1d BSD-2-Clause, OpenJPEG BSD-2-Clause, vvdec BSD-3-Clause-Clear.
    - Confirm at scaffold which of them are actually linked.
  - **CSP:** `libheif-js/libheif-wasm/*` contains no `eval(` or `new Function`, so it works under our CSP (`'wasm-unsafe-eval'` only).
  - `heic-to` 1.6.6 is LGPL-3.0 too. Its default build contains `new Function` (it ships a separate `csp` build). It adds a second LGPL wrapper for no benefit, so it is not used.
  - `heic2any` bundles libheif and is unmaintained, so it is not used.
- **Decision:** **ship HEIC input** (convert-image; jpg-to-pdf input) using `libheif-js` (`libheif-wasm` build), under these conditions:
  1. **Separate and unmodified.** The libheif files are copied from `node_modules` into a versioned public path (e.g. `/vendor/libheif-js-1.23.5/`) at build time. They are loaded at runtime **on intent** (when a HEIC file is selected), inside the image worker. They are **never bundled** into Sprigkit chunks. A user can replace the file with a compatible build (LGPL-3.0 §4(d)(1)).
  2. **License texts shipped.** The LGPL-3.0 and GPL-3.0 texts sit next to the files and appear on the `/licenses` page, together with the libheif and libde265 copyright notices (LGPL-3.0 §4(a)–(b)).
  3. **Corresponding source available.** The `/licenses` page links to the exact upstream source: libheif tag, libde265 version, and the libheif-js / libheif-emscripten build scripts for that version. **We also self-host the source tarballs** so availability does not depend on a third party (GPL-3.0 §6(d) via LGPL-3.0 §4(d)(0)/(e)). The tarballs must be under the 25 MiB per-file limit.
  4. **Prominent notice.** convert-image's "Formats & limits" content states that HEIC decoding uses libheif (LGPL-3.0), with a link to `/licenses`.
  5. **CI.** The license gate allows `LGPL-3.0` **only** for `libheif-js`, by exact package name. Any other LGPL package still fails.
- **Consequences:**
  - [dependencies-licenses.md §4](../04-architecture/dependencies-licenses.md#4-under-review), [mvp-scope.md](../01-product/mvp-scope.md) and [tool-specifications.md](../04-architecture/tool-specifications.md) updated.
  - Phase 6 tasks P6-T04/T08/T09 apply.
  - HEVC patent exposure is a separate, non-license risk: see R-9.
  - **Not legal advice.** If the project is ever monetized or incorporated, have the LGPL compliance and R-9 reviewed by a qualified person.
  - **Fallback:** if any condition cannot be met at implementation, launch without HEIC. Show a "not supported yet" message, per the spec acceptance test, and record a superseding decision.

### D-11: Final MVP slugs

- **Status:** [Decision] 2026-10-13.
- **Context:** slugs become permanent once indexed. Evidence is in [keyword-research.md](../03-seo-growth/keyword-research.md):
  - Google and Bing autocomplete ordering.
  - Competitor URL patterns ([competitor-research.md](../01-product/competitor-research.md)).
  - **Google Trends could not be collected automatically** (HTTP 429). The phase plan's fallback applies: "rely on … autocomplete + competitor URL patterns; decide and move on".
- **Decision:** 19 slugs, as listed in [keyword-research.md §4.1](../03-seo-growth/keyword-research.md#41-final-slugs). Renamed:

  | Old | New | Reason |
  |---|---|---|
  | `image-to-pdf` | `jpg-to-pdf` | Dominant query phrasing and the slug used by Smallpdf, Sejda, Adobe and iLovePDF (`jpg_to_pdf`); page still accepts PNG/WebP/HEIC |
  | `pdf-to-image` | `pdf-to-jpg` | Same reasoning; PNG is an option on the page |
  | `base64-encoder-decoder` | `base64-encode-decode` | Users type the verb ("base64 decode/encode"); "base64 encode decode" is offered by both engines |
  | `url-encoder-decoder` | `url-encode-decode` | Consistency with Base64; "url encode decode" offered by both engines |

- **Consequences:**
  - Slugs updated in mvp-scope, tool-registry §8, tool-specifications, the roadmap and the phase files.
  - The manual Trends check ([keyword-research.md §5](../03-seo-growth/keyword-research.md#5-manual-follow-up-google-trends-p0-t05)) may revisit `jpg-to-pdf` / `pdf-to-jpg` **only before the first production deploy**. After that, a slug change needs a 301 in `public/_redirects` and a superseding decision here.

### D-12: requirements.md

- **Status:** [Decision] 2026-10-13.
- **Decision:** do not write `01-product/requirements.md`. Requirements are already specified, without gaps found, in four places:
  - Functional: [mvp-scope.md](../01-product/mvp-scope.md) (tools, global features G-1–G-11, limits, Definition of Done) and [tool-specifications.md](../04-architecture/tool-specifications.md) (per-tool behaviour and errors).
  - Non-functional: [product.md](../01-product/product.md) (constraints, metrics) and [architecture.md](../04-architecture/architecture.md) (performance, security, PWA, CI).

  A consolidated copy would duplicate these and drift. [docs/README.md](../README.md) marks it "merged into existing docs".

### D-13: Repository visibility and license

- **Status:** [Decision] (proposed) 2026-10-13, P1-T01. The owner should confirm or supersede it.
- **Context:**
  - The GitHub repository (`malikaliraza-2005/Tool-Stack-MULTI-TOOLS-SAAS`) already exists and is **public**.
  - GitHub Actions minutes are free and unlimited for public repositories; private repositories have a monthly allowance (Phase 1 risk table).
  - A public source supports the "provably private" message (R-2): anyone can check that nothing is uploaded.
  - Open-sourcing the code would let anyone clone the product; nothing in product.md requires it.
- **Options:** (1) private repo; (2) public, all rights reserved; (3) public under an open-source license (all or parts).
- **Decision:** **option 2.** Keep the repo public; no open-source license is granted. `package.json` uses `"license": "UNLICENSED"` and `"private": true`; the README states "All rights reserved".
- **Consequences:**
  - Free CI minutes; the source can be read and audited, but not reused.
  - Open-sourcing parts later (e.g. the license gate or the no-network test helper) needs a superseding decision.
  - The repository name still contains "Tool-Stack" (the old working name, D-5). Renaming it to `sprigkit` on GitHub is an owner action; GitHub redirects the old URL.

### D-14: Bundler (webpack instead of Turbopack)

- **Status:** [Decision] 2026-10-13, from the Phase 1 spikes (P1-T19–T22). Applies the fallback planned in the Phase 1 risk table.
- **Context:**
  - Next.js 16 uses Turbopack by default.
  - Turbopack starts dedicated Web Workers through a bootstrap script that reads its chunk list from the worker URL fragment (`#params=…`). WebKit drops the fragment from the worker's `location`, so every Turbopack worker failed to start in Playwright WebKit (12/12 runs; details in [architecture.md §8.4](../04-architecture/architecture.md#84-phase-1-spike-results)).
  - Every file tool depends on module workers (A-5), and Safari is a target browser.
  - With `next build --webpack`, the jSquash, pdf.js, pdf-lib and Serwist spikes pass in Chromium, Firefox, WebKit and mobile.
- **Options:** (1) Turbopack and accept broken Safari workers; (2) Turbopack plus self-built worker bundles in `public/` (own esbuild step); (3) webpack for dev and production.
- **Decision:** **option 3.** `npm run dev` = `next dev --webpack`; `npm run build` = `next build --webpack`. Tailwind runs through `@tailwindcss/postcss`, which both bundlers support.
- **Consequences:**
  - Slower builds and HMR than Turbopack (webpack build of the scaffold: ~5 s compile).
  - Dev and production use the same bundler, so worker behaviour matches in every browser.
  - **Revisit** when a Next.js release changes the Turbopack worker bootstrap, or if real Safari (Phase 9 device tests) turns out to keep the fragment. Switching back means removing `--webpack` and re-running the spike tests on the `spikes` branch.

---

## 3. Risk register

Likelihood and impact are qualitative judgements **[Estimate]**. Review at every phase exit and monthly after launch (Phase 11).

| # | Risk | Likelihood | Impact | Mitigation | Owner / trigger |
|---|---|---|---|---|---|
| R-1 | Saturated search results; slow growth | High | High | Long-tail and privacy-specific queries (autocomplete confirms they exist for every tool), community launch, original content, patience (months, not weeks) | Phase 11 monthly review |
| R-2 | "No upload" no longer unique: small client-side competitors (BentoPDF, CoolPDF, etc.) | High | Medium | Make privacy **provable** (CSP, offline, how-to-verify copy), plus premium design and lossless quality; see [competitor-research.md](../01-product/competitor-research.md) | Phase 8 copy |
| R-3 | Browser memory limits on mobile | Medium | Medium | Per-tool limits, Web Workers, device testing, honest error messages | Phase 9 device tests |
| R-4 | License violations | Medium | High | Policy in [dependencies-licenses.md](../04-architecture/dependencies-licenses.md); CI license gate; LGPL allowed only for `libheif-js` (D-6) | Every new dependency |
| R-5 | Solo maintenance load | Medium | Medium | Shared workbench, registry-driven pages, strict scope, remove weak tools | Phase 11 |
| R-6 | Trademark conflict for "Sprigkit" (registers not yet searched) | Unknown | High | Manual USPTO/WIPO/EUIPO search before brand work (D-5 checklist); shortlist alternatives ready | Before Phase 2 |
| R-7 | Domain `sprigkit.com` registered by someone else before purchase | Low–Medium | Medium | Register promptly (D-1) | Now |
| R-8 | Slugs chosen without Trends data are not the best phrasing | Low–Medium | Low | Manual Trends check before first production deploy; one page targets all phrasings in title/H1/keywords | Before first deploy |
| R-9 | HEVC patent claims related to distributing a HEIC (HEVC) software decoder | Unknown | Medium | Decoder is unmodified open-source libheif/libde265, offered free. Re-assess before monetization; fallback is removing HEIC input | Before monetization (P11-T10) |
| R-10 | AI assistants reduce demand for simple tools | Medium | Medium | Focus on file and sensitive-data tools; prioritize by data | Phase 11 |
| R-11 | Hosting terms change | Low–Medium | Medium | Static output is portable; avoid platform-specific features | Before monetization |
| R-12 | Free subdomain limits SEO and monetization | — | — | **Closed** by D-1 (owned domain) | — |
| R-13 | Name collision ("ToolStack") | — | — | **Closed** by D-5 (renamed to Sprigkit) | — |
| R-14 | Framework JS alone exceeds the homepage JS budget: Next.js 16 + React 19 ship **141 KB gzipped** on a near-empty page (Lighthouse, 2026-10-13) vs the 100 KB budget ([architecture.md §14](../04-architecture/architecture.md#14-performance-budgets-target)) | High | Medium | Budget is warn-only until P9. Keep our initial JS minimal (server components, on-intent loading). **Owner decision needed by Phase 9:** raise the homepage budget to measured framework baseline + headroom, or accept the overrun | Phase 2 shell; Phase 9 |
| R-15 | Turbopack workers fail in WebKit; we depend on webpack support in Next.js | Medium | Medium | D-14; spike tests kept on the `spikes` branch to re-check new Next.js versions | Every Next.js upgrade |
