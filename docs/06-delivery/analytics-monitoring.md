# Analytics and monitoring

| | |
|---|---|
| **Last updated** | 2026-11-02 (P9-T19: no analytics at launch, owner decision) |
| **Related** | [architecture.md §11](../04-architecture/architecture.md#11-security-and-privacy) · [privacy-policy.md](../07-legal/privacy-policy.md) · [deployment.md](deployment.md) · [launch-checklist.md](launch-checklist.md) |

How we learn whether Ondevo works and is found, without collecting anything about what people do with their files.

---

## 1. Decision: no analytics at launch

**Owner decision (P9-T19, 2026-11-02):** Ondevo launches with **no analytics script**: no Cloudflare Web Analytics, no third-party or self-hosted tracker, no cookies.

Why:
- The privacy claim stays absolute and checkable: the CSP (`script-src 'self'`, `connect-src 'self' blob: data:`) and the no-network E2E test allow no request to another origin, and the product facts ("no accounts, cookies, ads or analytics") stay true on every page without exceptions.
- What we need at launch (is the site up, is it indexed, which pages are found) is available without a script (§2).

Consequences: CSP unchanged; the Privacy page and product facts unchanged; P10-T03 ("enable analytics") is skipped.

## 2. What we use instead

| Question | Source | Script on the site? |
|---|---|---|
| Is the site up and deploying? | Cloudflare Pages deployments and build logs | No |
| How much traffic, from where? | Cloudflare's server-side traffic numbers for the domain once `ondevo.com` is on Cloudflare (requests, countries, bandwidth). Aggregate only; no per-user data | No |
| Are pages indexed, which queries find them? | Google Search Console and Bing Webmaster Tools (P10-T04, P10-T05) | No (DNS or file verification) |
| Is something broken for users? | User reports through the contact address on About and Privacy; E2E and Lighthouse CI on every change | No |

There is no client-side error reporting: an error report could contain file names or content, and the CSP blocks any reporting endpoint. Errors are shown to the user with a specific message and a "Details" toggle (tool-specifications §2.4), so a user can paste the details into a report if they choose.

## 3. Routine checks after launch

| When | Check |
|---|---|
| Daily for the first 2 weeks (P10-T13, P10-T14) | Contact inbox; Search Console coverage and errors |
| Monthly | Search Console performance (queries, pages); Cloudflare traffic totals; `npm audit --omit=dev`; Cloudflare and search-tool terms (P11-T07) |

## 4. If analytics is added later

It is a product decision, not a launch task. Before enabling any provider:
1. Choose a cookieless provider that never receives tool content (architecture §11).
2. Add its exact script and beacon hosts to `script-src` / `connect-src` in `public/_headers`, and allow them in the `noNetwork` E2E fixture by name.
3. Update the Privacy page and **publish it before** enabling ([privacy-policy.md](../07-legal/privacy-policy.md) §3), and change the product facts everywhere they appear (product.md §10, About, `llms.txt`, page-seo-specs.md).
4. Verify on production that the data arrives and contains no tool content.
