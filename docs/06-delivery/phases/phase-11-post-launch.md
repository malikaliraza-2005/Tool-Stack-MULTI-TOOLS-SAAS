# Phase 11: Post-Launch Iteration

| | |
|---|---|
| **Status** | ⬜ Not started |
| **Effort** | Ongoing |

## Goal
Improve Sprigkit with real data: fix what users hit, strengthen pages that get impressions, retire what doesn't work, add Tier 2 tools in order of evidence, and introduce monetization only when it won't harm the product.

## Entry criteria
- M7 reached (launched).

## Read first
- `06-delivery/analytics-monitoring.md`
- [mvp-scope.md §5.1 Tier 2](../../01-product/mvp-scope.md#51-tier-2-next-ordered-by-data-after-launch)
- [product.md §9 Monetization roadmap](../../01-product/product.md#9-monetization-roadmap)

## Recurring loops

### Weekly
- [ ] **P11-T01** Triage bug reports and feedback; fix P0/P1.
- [ ] **P11-T02** Review client error reports (if monitoring enabled) and failing CI runs.

### Monthly
- [ ] **P11-T03** Search Console review: impressions, clicks, CTR, queries per tool; pages with impressions but low CTR → improve title/description; queries we don't serve well → improve content or consider a tool.
- [ ] **P11-T04** Core Web Vitals field data review; fix regressions.
- [ ] **P11-T05** Dependency updates (review, test, merge); license gate.
- [ ] **P11-T06** Publish 1–2 high-quality guides (per content-strategy.md).
- [ ] **P11-T07** Re-verify hosting terms and free limits (Cloudflare) and analytics terms.

### Quarterly
- [ ] **P11-T08** Tool portfolio review: improve, keep, or retire each tool (retire = 301 redirect to the closest tool).
- [ ] **P11-T09** Choose next Tier 2 tools using Search Console queries, feedback, and P0-style validation; run each through the scope change process.
- [ ] **P11-T10** Monetization readiness review (product.md §9): traffic levels, audience mix, ad-network requirements, privacy and performance impact. Introduce only with a written decision.

## One-time tasks after launch
- [ ] **P11-T11** Write `06-delivery/maintenance.md` (the loops above as a runbook).
- [ ] **P11-T12** Write `03-seo-growth/monetization.md` when monetization is first considered.
- [ ] **P11-T13** Items deferred from earlier phases (e.g. regex explanation, sign-pdf form filling if postponed, CSP hash hardening).

## Success signals to watch (no numeric targets until baselines exist)
- Growing count of tool pages receiving search impressions.
- Rising returning-visitor share.
- Core Web Vitals passing in field data.
- Backlinks and mentions from communities.
- Low error rates per tool.
