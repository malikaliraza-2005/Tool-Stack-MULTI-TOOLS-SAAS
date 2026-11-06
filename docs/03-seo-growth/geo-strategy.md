# GEO Strategy (AI-assisted search)

| | |
|---|---|
| **Last updated** | 2026-11-02 (Phase 8, P8-T13) |
| **Related** | [product.md §10](../01-product/product.md#10-seo-and-geo-principles) · [seo-strategy.md](seo-strategy.md) · [content-strategy.md](content-strategy.md) · [page-seo-specs.md](page-seo-specs.md) |

"GEO" here means being found and cited by AI search features (Google AI Overviews and AI Mode, chat assistants that browse). Our position: **there is no separate trick.** We do the SEO fundamentals well, write factual pages with consistent product facts and original information, and let crawlers in. This document says what we do and, just as important, what we don't claim works.

---

## 1. What the search engines say

| Statement | Source (checked 2026-11-02) |
|---|---|
| "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary." No new machine-readable files, AI text files or special schema.org markup are needed | [AI Features and Your Website](https://developers.google.com/search/docs/appearance/ai-features), Google Search Central |
| FAQ rich results are shown only for "well-known, authoritative government and health websites" (since August 2023); How-to rich results are deprecated. Unused markup "does not cause problems for Search" | [Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes), Google Search Central blog |
| A software-app rich result needs `aggregateRating` or `review` | [Software app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app), Google Search Central |

## 2. What we do

1. **SEO fundamentals** (seo-strategy.md): one intent per page, the tool server-rendered in the HTML, unique titles and descriptions, canonical URLs, sitemap, fast pages.
2. **Answer-first, factual writing.** Tool pages and guides say plainly what happens, with real numbers and names (content-voice-ux-copy §1). Each tool page answers the questions people ask about it (keyword-research §2), including "is it uploaded" and "does it work offline".
3. **Consistent product facts** everywhere a model might read them: 19 tools, processing in the browser, no accounts, cookies, ads or analytics, offline after the first visit, visual (not certified) signatures. The same facts are on the homepage, About, Privacy, Terms, every tool page's privacy section and `llms.txt`. Changing one means changing all (privacy-policy.md §2).
4. **Original information.** Facts only OfflineBench can state (our limits, behaviour, verified by the code) and, next, our own measurements (content-strategy §2, web formats guide).
5. **Cited sources** in guides, visible on the page and in `Article.citation`.
6. **Structured data that mirrors the page**: BreadcrumbList everywhere; WebApplication, FAQPage, CollectionPage, Article, WebSite and Organization where they fit. Checked on every page by `e2e/structured-data.spec.ts` (P8-T14).
7. **Crawlers allowed** (D-7): `robots.txt` allows all user agents, including AI crawlers; previews are `noindex`.
8. **`llms.txt`** (`/llms.txt`, generated from the registries): a plain map of tools, guides and product facts. Cheap to keep correct, so we ship it.

## 3. What we don't claim works

| Idea | Our position |
|---|---|
| `llms.txt` improves rankings or AI citations | No evidence; Google says no AI text files are needed. Kept as a courtesy, not a strategy |
| FAQPage markup gets rich results | Not for us (government and health sites only). We keep it because it mirrors visible FAQs, costs nothing and causes no problems. We don't add FAQs for markup's sake |
| WebApplication markup gets a software rich result | Not without ratings or reviews, which we don't have and **will not invent**. The markup stays as accurate description |
| Special "AI schema", prompt-like text, hidden text for bots | Not used. Pages are the same for people and crawlers |
| Keyword-stuffed pages per phrasing or size target | Not used (product.md §10, content-strategy §1) |
| Measuring "AI visibility" with paid tools | Out of budget and unreliable. After launch: Search Console impressions and referral traffic, reviewed in Phase 11 |

## 4. Review

Re-check the sources in §1 when Phase 11 reviews search performance, or when Google changes its AI-features documentation. Update §2 and §3 in the same change.
