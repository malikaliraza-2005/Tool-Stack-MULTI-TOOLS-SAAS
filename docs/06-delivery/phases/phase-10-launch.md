# Phase 10: Launch

| | |
|---|---|
| **Status** | ⬜ Not started |
| **Effort** | 2–3 days [Estimate] (plus community follow-up) |
| **Milestone** | M7: Launched |

## Goal
Make Sprigkit public, get it indexed, and introduce it to the right communities honestly and without spam.

## Entry criteria
- M6 reached: all Phase 9 release gates pass.

## Read first
- `06-delivery/launch-checklist.md` (from P9)
- [product.md §9–11](../../01-product/product.md#9-monetization-roadmap)

## Tasks

### Go live
- [ ] **P10-T01** Connect the domain (if D-1 = buy) to Cloudflare Pages; set `NEXT_PUBLIC_SITE_URL`; HTTPS verified; redirect `*.pages.dev` production host to the domain.
- [ ] **P10-T02** Production deploy from `main`; smoke test every tool on production.
- [ ] **P10-T03** Enable analytics (per P9-T19); verify data arrives and contains no tool content.

### Search engines
- [ ] **P10-T04** Google Search Console: verify property, submit sitemap, URL-inspect homepage + 5 key tool pages, request indexing.
- [ ] **P10-T05** Bing Webmaster Tools: verify, submit sitemap.
- [ ] **P10-T06** Check rendered HTML in URL Inspection matches expectations (content present without JS interaction).

### Community launch (honest, following each community's rules)
- [ ] **P10-T07** Prepare launch materials: short description, screenshots/GIF of the tool in action, the privacy claim and how to verify it.
- [ ] **P10-T08** "Show HN" post (developer tools + privacy angle); be present to answer questions.
- [ ] **P10-T09** Relevant subreddits only where self-promotion is allowed (read rules first); dev.to/Hashnode write-up of how local processing works.
- [ ] **P10-T10** Submit to reputable tool directories and "awesome" lists where Sprigkit genuinely fits.
- [ ] **P10-T11** Open-source a useful part (e.g. a detector library or the image pipeline) if decided, with a link back.
- [ ] **P10-T12** Add donation link (GitHub Sponsors or similar).

### Follow-up (first 2 weeks)
- [ ] **P10-T13** Triage feedback and bug reports daily; fix P0/P1 quickly.
- [ ] **P10-T14** Monitor Search Console coverage and errors; fix indexing issues.

## Exit criteria
- [ ] Production live on final URL; all tools working.
- [ ] Sitemaps submitted to Google and Bing; homepage indexed.
- [ ] Launch posts published; feedback triaged.

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Launch post gets little attention | Normal; focus on steady channels (search, directories, guides). Don't repost spam-style |
| Traffic spike | Static assets on Cloudflare: no action needed; watch for client errors |
| Bug found by early users | Rollback via Cloudflare (instant) while fixing |
