# Sprigkit: Product Requirements

| | |
|---|---|
| **Product** | Sprigkit: private, browser-based tools for files and developers |
| **Version** | 0.3 (Draft) |
| **Last updated** | 2026-10-13 |
| **Owner** | Saraan |
| **Related** | [mvp-scope.md](mvp-scope.md) · [design-system.md](../02-design/design-system.md) · [architecture.md](../04-architecture/architecture.md) |

> Labels: **[Verified]** checked against a primary source on the date above · **[Target]** planning goal · **[Estimate]** informed guess · **[Decision]** agreed · **[Open]** undecided. No traffic, keyword-volume, or revenue figures are included; none were available from reliable free sources.

---

## 1. Summary

Sprigkit is a collection of high-quality online tools that run **entirely in the user's browser**. Files and text are never uploaded.

The MVP has two pillars:

1. **Private file tools (PDF and image)** for the general public. This is the primary organic-search engine.
2. **A focused developer workbench.** This drives community launch, word of mouth, and backlinks.

Sprigkit competes on **verifiable privacy** ("0 bytes uploaded"), **exceptional design and motion**, and **speed**, not on the number of tools. It is built and operated at zero cost on static hosting, with no database, backend, or accounts.

The exact MVP tool list is in [mvp-scope.md](mvp-scope.md).

---

## 2. Problem

- People regularly need to merge a PDF, sign a form, convert an iPhone photo, strip location data from a picture, or decode a JWT. The leading sites for these tasks commonly **process files on their servers**, which is a real concern for contracts, IDs, payslips, personal photos, access tokens, and internal data.
- Many multi-tool sites are cluttered, ad-heavy, slow, and visually generic.
- Developers are reluctant to paste production tokens or internal JSON into unknown websites.

## 3. Market observations

- **Head terms are saturated.** iLovePDF, Smallpdf, 123apps, TinyWow, CodeBeautify, Convertio, jwt.io, regex101, and crontab.guru are long established. *[Qualitative observation]* A new site will not compete for head terms early.
- **Developer utilities have proven demand.** **[Verified 2026-10-13]** Open-source collections built around these tools have large followings: it-tools ≈40.8k GitHub stars, CyberChef ≈36.1k, DevToys ≈32.1k. One "JSON Formatter" Chrome extension lists 2,000,000 users. The most-reacted feature request in it-tools is a regex tester. *(Stars and installs show interest, not search volume.)*
- **AI assistants are absorbing simple text tasks** (rewriting, case conversion, summaries). *[Qualitative observation]* Tools that process files or sensitive data locally are less exposed.

**Opportunity:** browser-only processing, forced by the zero-budget constraint, becomes the main differentiator: *private by architecture, provable to the user.*

---

## 4. Positioning

**Working tagline:** *Private, beautiful tools that run entirely on your device.*

| Differentiator | How it is delivered |
|---|---|
| Verifiable privacy | All processing local; Content-Security-Policy blocks outbound connections from tools; live "0 bytes uploaded" indicator; works offline once loaded |
| Premium design and motion | Distinctive art direction, purposeful motion system, tool-specific layouts |
| Speed and focus | Static pages, minimal JavaScript, no sign-up, no intrusive ads, keyboard-first |
| Smart entry points | Drop any file or paste any text on the homepage and Sprigkit suggests the right tool |

---

## 5. Goals and non-goals

### Goals
1. Launch an MVP of **19 excellent tools** ([mvp-scope.md](mvp-scope.md)) instead of many mediocre ones.
2. Operate at **$0/month** for hosting and services.
3. Make every tool page **independently indexable** and useful as a search landing page.
4. Meet the design, motion, accessibility, and performance criteria in the design and architecture documents.
5. Build trust and organic growth before introducing monetization.

### Non-goals (MVP)
- User accounts, authentication, cloud storage, or sync.
- A database or custom backend/API. **[Decision]** No database is needed for the MVP.
- Paid APIs, including AI APIs.
- Server-side file processing.
- Video and audio processing.
- Display advertising at launch.
- Programmatically generated "X to Y" pages targeting keyword variations.

---

## 6. Target users

| Segment | Typical jobs | Pillar |
|---|---|---|
| **Everyday users** (office workers, job seekers, parents) | Merge/split documents, sign a form, convert iPhone photos, shrink images for upload | File tools |
| **Students** | Combine scans into a PDF, extract pages, compress images for submissions | File tools |
| **Freelancers and creators** | Optimize images, remove location metadata, prepare PDFs for clients | File tools |
| **Developers** | Format/validate JSON, decode JWTs, encode/decode, diff, test regex, convert timestamps | Developer tools |
| **Technical adjacent roles** (QA, support, data analysts) | JSON, Base64, URL, timestamps, diff | Developer tools |

**Persona A: privacy-conscious everyday user.** Needs to handle a sensitive document quickly on a laptop or phone; distrusts uploading; not technical.

**Persona B: working developer.** Keyboard-driven; wants instant, accurate tools that never send data anywhere; will share a good tool with colleagues.

---

## 7. Constraints

### 7.1 Zero budget
No paid hosting, APIs, databases, subscriptions, or trial-dependent services. The only cost is a domain, about $10–12/year **[Estimate]** (D-1: buy `sprigkit.com`).

Every dependency or service is classified as one of:
*Free & open source* · *Free for commercial use* · *Free within an allowance* · *Trial only* · *May create future cost*.
Only the first three are permitted, and allowance-based services must be optional and replaceable.

### 7.2 Hosting **[Verified 2026-10-13]**

| Option | Finding | Decision |
|---|---|---|
| **Cloudflare Pages / Workers static assets** | Static asset requests "free and unlimited"; Pages limits 500 builds/month, 20,000 files, 25 MiB per file | **Selected.** Re-check commercial-use terms before monetization |
| Vercel Hobby | Restricted to non-commercial use; advertising (including AdSense) counts as commercial | Rejected |
| GitHub Pages | "Not intended for or allowed to be used as a free web-hosting service to run your online business" | Rejected |
| Netlify Free | 300-credit limit; bandwidth billed in credits | Not selected (growth risk) |

Implication: every deployed file must be **under 25 MiB** (rules out ffmpeg.wasm core and similar).

### 7.3 Database-free architecture
All MVP tools process data locally with browser APIs, WebAssembly, and open-source libraries. Preferences (theme, favorites, recent tools, tool options) are stored in `localStorage`. A database would only become necessary for accounts, cloud saving, or data shared between users, none of which are planned.

Trade-offs accepted:
- Processing speed and maximum file size depend on the user's device.
- No server-side fallback when a device runs out of memory; tools must fail clearly and helpfully.
- No usage data beyond privacy-friendly analytics.

---

## 8. Success metrics

Tooling and definitions will be detailed in `06-delivery/analytics-monitoring.md`.

| Area | Metric |
|---|---|
| Search | Indexed pages / submitted pages; organic impressions, clicks, CTR per tool page; number of tools receiving search entries |
| Usage | Tool completion rate (where measurable without collecting content); returning visitors |
| Quality | Core Web Vitals pass rate; error rate per tool; zero broken links |
| Growth | Referrals from communities and AI assistants; backlinks |

**[Decision]** No numeric traffic targets are set until baseline data exists (about 8–12 weeks after indexing).

---

## 9. Monetization roadmap

| Phase | Model | Conditions |
|---|---|---|
| Launch | **None**, plus a donation link (e.g. GitHub Sponsors) | Protects privacy promise and performance |
| Traction | Privacy-respecting developer ad networks (e.g. EthicalAds, Carbon) on developer pages only | Must meet network traffic thresholds; never inside the tool area |
| Later | Google AdSense, evaluated | Requires an owned domain, approval, and consent management in EEA/UK; measure CWV impact; never inside or next to the tool workspace |
| Later | Relevant affiliate links in guides | Disclosed; only genuinely useful products |
| Future | Optional premium (e.g. advanced batch, desktop app) | Only if real demand appears |

No revenue, traffic, or approval is assumed or guaranteed. Hosting terms must be re-verified before any monetization.

---

## 10. SEO and GEO principles

Detailed strategy will live in `03-seo-growth/`. Binding principles:

- Every tool page is **statically pre-rendered** with the tool and useful supporting content in the initial HTML.
- **One search intent per page.** No near-duplicate pages, no keyword stuffing, no arbitrary word counts.
- Flat, descriptive URLs (e.g. `/merge-pdf`, `/jwt-decoder`) plus category hubs (`/pdf-tools`, `/image-tools`, `/developer-tools`).
- Unique title, description, H1, and canonical per page, generated from the [tool registry](../04-architecture/tool-registry.md).
- **[Verified 2026-10-13]** Google states there are no additional requirements, special files, or special schema needed to appear in AI Overviews/AI Mode. GEO therefore means strong SEO fundamentals, clear factual writing, consistent product facts, original information, and allowing crawlers. `llms.txt` may be added but is not expected to affect rankings.
- Ethical off-page only: open source, community launches, reputable directories, genuinely helpful answers. No paid links or spam outreach.

---

## 11. Release phases

| Phase | Content |
|---|---|
| **0. Validation** | Compare candidate tools with Google Trends, autocomplete, "People also ask", Keyword Planner ranges, Bing keyword research; confirm final slugs; check name availability |
| **1. Foundations** | Design tokens, components, motion system, tool registry, page template, SEO generation, CSP, PWA shell, CI, deployment |
| **2. Tools** | Developer workbench and developer tools, then PDF tools, then image tools |
| **3. Launch** | Search Console and Bing submission, community launch, directory listings, first 3–5 guides |
| **4. Iterate** | Monthly Search Console review; improve or remove weak tools; add Tier 2 tools based on data |

**[Decision]** All tools launch together, with file tools leading the positioning.

---

## 12. Risks

The risk register now lives in [risks-and-decisions.md §3](../06-delivery/risks-and-decisions.md#3-risk-register).

---

## 13. Decisions

The decision log now lives in [risks-and-decisions.md](../06-delivery/risks-and-decisions.md). Key Phase 0 outcomes (2026-10-13):

- **D-1:** buy `sprigkit.com`.
- **D-5:** the product is named **Sprigkit**, replacing the working name "ToolStack", which collided with an existing product.
- **D-6:** HEIC ships, using `libheif-js` under LGPL-3.0 conditions.
- **D-11:** final slugs.

---

## 14. References (checked 2026-10-13)

- Vercel fair use and commercial usage: https://vercel.com/docs/limits/fair-use-guidelines
- Cloudflare static assets billing: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Netlify pricing: https://www.netlify.com/pricing/
- Google: AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- AdSense ads.txt and subdomains: https://support.google.com/adsense/answer/9785052
- it-tools: https://github.com/CorentinTh/it-tools
- CyberChef: https://github.com/gchq/CyberChef
- DevToys: https://github.com/DevToys-app/DevToys
- JSON Formatter (Chrome Web Store): https://chromewebstore.google.com/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa
- RMBG-1.4 model card (non-commercial license): https://huggingface.co/briaai/RMBG-1.4
