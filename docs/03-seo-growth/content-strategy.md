# Content Strategy

| | |
|---|---|
| **Last updated** | 2026-11-02 (Phase 8, P8-T10) |
| **Status** | Guides system built (P8-T11); 3 guides published (P8-T12) |
| **Related** | [keyword-research.md](keyword-research.md) · [page-seo-specs.md](page-seo-specs.md) · [geo-strategy.md](geo-strategy.md) · [content-voice-ux-copy.md](../02-design/content-voice-ux-copy.md) |

OfflineBench's content has one job: help someone finish the task they searched for. Tool pages carry the "how to use this tool" content; **guides** answer the questions around a task that a tool page shouldn't, such as device settings, formats and safety. Every guide leads to a tool, and every claim in it is either checked against our code or cited.

---

## 1. What goes where

| Content | Lives in | Example |
|---|---|---|
| How to use one tool, its options, limits, errors | The tool page (`content.tsx`, FAQs in `meta.ts`) | Compress Image's quality slider |
| Choosing between tools | Category hub ("Which tool do I need?", `hubs.ts`) | Compress vs Resize |
| A task that spans devices, settings or several tools | A guide | Removing location on iPhone, Android and computers |
| Background a user needs to act safely | A guide | Decoding versus verifying a JWT |
| Device how-tos for built-in OS features | A guide, never a tool page (keyword-research §2.3) | iPhone "Most Compatible" setting |

**Not written:** pages per size target or format pair ("compress image to 100 KB", "PNG to WebP"), keyword variants of one intent, news, or content without a matching tool (product.md §10: one intent per page, no programmatic variants).

## 2. Topics

Published (P8-T12), each from keyword-research findings:

| Guide | Main tool | Why (keyword-research) |
|---|---|---|
| [How to remove location data from photos](../../src/guides/remove-location-from-photos.tsx) | remove-exif-data | "remove location from photo" with iPhone/Android variants (§3.2); privacy intent (§2.1) |
| [What’s inside a JWT, and is it safe to decode one?](../../src/guides/what-is-inside-a-jwt.tsx) | jwt-decoder | "decode jwt locally", "is jwt decode safe", "decoding vs verifying" (§3.3) |
| [HEIC vs JPG](../../src/guides/heic-vs-jpg.tsx) | convert-image | "heic to jpg" with strong safety intent; device settings (§3.2, §2.3) |

Backlog, in order (each needs a matching tool and sources):

1. **Web image formats compared** (JPG, PNG, WebP, AVIF) with OfflineBench's own measurements: same photos through Compress Image, sizes and encode times recorded with device and date. Original data is the strongest content we can offer (geo-strategy §2).
2. **How to verify a file checksum** (hash-generator): "verify checksum", "sha256 decrypt" misconceptions (§3.3).
3. **Is it safe to merge, sign or convert PDFs online?** (merge-pdf, sign-pdf): the "is … safe" cluster (§2.1), with how to check any site in DevTools.
4. **How to compress an image to a target size** (compress-image): the size-target cluster (§2.5), answered honestly with the quality slider and Longest side, since there is no target-size mode.

Promote a topic only when Search Console shows impressions for it after launch (Phase 11).

## 3. Format (as built, P8-T11)

- One file per guide in `src/guides/<slug>.tsx`: a `meta` object (`GuideMeta`: title, description, H1, summary, author, dates, tools, sources) and the article as a component built from the tool content blocks (`ContentSection`, `Steps`, `Facts`, `CodeBlock`…). Listed in `src/guides/registry.ts`, newest first.
- URL `/guides/<slug>`, permanent once indexed. Index at `/guides`; the hubs link the guides whose **main tool** (the first in `tools`) is in their category, instead of that tool's short "How to use" link.
- The template (`GuidePage`) shows breadcrumbs, H1, summary, a byline (author linked to /about, published and updated dates), the article, "Tools used in this guide" and "Sources". JSON-LD `Article` mirrors the byline (headline, author, dates, publisher) and lists the sources as `citation`.
- `registry.test.ts` fails the build on: SEO lengths, a title or H1 used by another page, dates, unpublished tools, missing or non-https sources.

## 4. Writing and review

Each guide, before publishing:

1. **Facts from code** (OfflineBench behaviour, labels, limits) are checked against the code and the tool's reviewed content, never the spec alone.
2. **Facts from outside** (device steps, standards, browser support) come from a primary source: the vendor's own help page, the RFC or standard, or a dataset such as Can I use. Cite it in `sources`. If no primary source confirms a claim, cut it or soften it (Phase 8 cut the Windows "Remove Properties" steps: only forum threads, with reports of it failing on location data).
3. **Examples are real:** tokens are generated and signed, timestamps converted, outputs produced by the tool.
4. **Voice:** content-voice-ux-copy.md. No hype, no "100% secure", no claims the CSP and code don't guarantee.
5. **Second read** by the owner or a fresh reviewer for accuracy, then publish with today's date.

## 5. Maintenance and cadence

- **Cadence:** one guide a month after launch while the backlog lasts; quality over count.
- **Review every guide every 6 months**, and whenever a tool it references changes (labels, limits, behaviour) or a cited source changes (OS updates move settings). Update `updated` only for real changes; the sitemap and Article JSON-LD use it.
- When a tool's UI label changes, search `src/guides/` for the old label in the same change.
