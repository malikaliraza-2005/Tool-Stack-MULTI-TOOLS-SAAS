# Phase 8: Content, SEO & Legal

| | |
|---|---|
| **Status** | ⬜ Not started |
| **Effort** | 6–8 days [Estimate]; starts after P3 and runs alongside P4–P7 |
| **Milestone** | M5: Feature-complete (with Phase 7) |

## Goal
Make every page genuinely useful and search-ready: final supporting content and FAQs for all 19 tools, per-page SEO specs, trust pages (About, Privacy, Terms, Licenses), and the first guides.

## Entry criteria
- Phase 3 complete (template and SEO generation exist). Tool content is drafted as each tool is built.

## Read first
- [product.md §10 SEO and GEO principles](../../01-product/product.md#10-seo-and-geo-principles)
- `03-seo-growth/keyword-research.md` (from P0)
- `02-design/content-voice-ux-copy.md` (from P2)

## Deliverables
- `page-seo-specs.md` complete for all pages.
- Final content + FAQs for all 19 tools and 3 hubs.
- About, Privacy, Terms, Licenses pages.
- 3–5 guides.

## Tasks

### SEO specs
- [ ] **P8-T01** Write `03-seo-growth/page-seo-specs.md`: per page URL, title, meta description, H1, H2 outline, FAQs (from P0 research), schema, related links.
- [ ] **P8-T02** Apply specs to every registry entry; build passes uniqueness validation.

### Tool content (per tool, in `content.tsx`)
- [ ] **P8-T03** For all 19 tools: intro, how-to steps, supported formats & limits, explanation of options/results, privacy note, troubleshooting, FAQs. No arbitrary word counts; no repeated boilerplate across pages.
- [ ] **P8-T04** Accuracy review of every page against the actual tool behaviour.
- [ ] **P8-T05** Hub page content (`/pdf-tools`, `/image-tools`, `/developer-tools`).

### Trust & legal
- [ ] **P8-T06** About page (G-10): what Sprigkit is, how it works, who runs it, contact method; consistent product facts.
- [ ] **P8-T07** Write `07-legal/privacy-policy.md` → Privacy page (G-9): local processing, analytics used (exact provider), no cookies/ads at launch, how to verify with DevTools.
- [ ] **P8-T08** Write `07-legal/terms-of-use.md` → Terms page (incl. "visual signature, not certified" and "provided as is").
- [ ] **P8-T09** Licenses page generated from the license report (dependencies-licenses §7).

### Guides
- [ ] **P8-T10** Write `03-seo-growth/content-strategy.md` (topics, mapping to tools, review process, cadence).
- [ ] **P8-T11** Build `/guides` index and guide template (Article JSON-LD, author, date, sources).
- [ ] **P8-T12** Write 3–5 guides (e.g. removing location data from photos; what's inside a JWT; HEIC vs JPG; web image formats compared using Sprigkit's own measurements). Each cites sources and is reviewed for accuracy.

### GEO & structured data
- [ ] **P8-T13** Write `03-seo-growth/geo-strategy.md` (what we do and what we don't claim works).
- [ ] **P8-T14** Validate structured data on every page type (Rich Results Test, Schema validator).
- [ ] **P8-T15** robots.txt allows search and AI crawlers (D-7); optional `llms.txt` (no ranking expectations).

## Docs to write / update
page-seo-specs.md · content-strategy.md · geo-strategy.md · privacy-policy.md · terms-of-use.md · tool registry entries

## Exit criteria
- [ ] Every page has unique title, description, H1, canonical; FAQs visible where FAQPage schema is used.
- [ ] Every tool page has reviewed, accurate supporting content.
- [ ] Privacy, Terms, About, Licenses pages live.
- [ ] At least 3 guides published on preview.
- [ ] Structured data valid on all page types.

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Content writing is slower than building | Draft content per tool during P4–P6; ship fewer guides at launch (minimum 3) |
| Legal wording uncertainty | Plain, honest policies matching actual behaviour; review against reputable templates; no legal claims beyond facts |
