# Deployment

| | |
|---|---|
| **Last updated** | 2026-10-13 (Phase 1: setup steps written; Cloudflare project not yet created) |
| **Related** | [architecture.md §11, §15](../04-architecture/architecture.md#15-cicd) · [risks-and-decisions.md](risks-and-decisions.md) (D-1, D-10) |

Sprigkit is a static export (`out/`) hosted on **Cloudflare Pages** with Git integration. There is no server, so a deploy is just an upload of files.

---

## 1. Environments

| Environment | Trigger | URL | `NEXT_PUBLIC_SITE_URL` | Indexing |
|---|---|---|---|---|
| Production | Push to `main` | `https://sprigkit.com` once the domain is bought and attached (D-1); until then `https://<project>.pages.dev` | `https://sprigkit.com` | Allowed on `sprigkit.com` only |
| Preview | Push to any other branch, or a PR | `https://<hash>.<project>.pages.dev` and `https://<branch>.<project>.pages.dev` | `https://sprigkit.com` (canonicals always point to production) | `X-Robots-Tag: noindex` |

Every `*.pages.dev` host, including the production alias, sends `noindex` (rules in `public/_headers`), so only the real domain can be indexed.

## 2. Cloudflare Pages setup (P1-T15, owner action)

Needs the Cloudflare dashboard and a pushed GitHub repository.

1. Push the repository to GitHub (`main` and, for P1-T17, a preview branch such as `spikes` or `preview-test`).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → select the repository.
3. Build settings:

   | Setting | Value |
   |---|---|
   | Project name | `sprigkit` (gives `sprigkit.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `out` |
   | Root directory | `/` |
   | Node.js version | from `.node-version` (24) |

4. Environment variables (Settings → Variables): `NEXT_PUBLIC_SITE_URL=https://sprigkit.com` for **Production** and **Preview**, and `NEXT_TELEMETRY_DISABLED=1`.
5. Settings → Builds → **Preview branch control:** all non-production branches.
6. Leave Cloudflare Web Analytics **off** until the analytics decision (architecture §11.1; adding it requires CSP changes).
7. Domain (after D-1 purchase): Custom domains → add `sprigkit.com` (and redirect `www`).

## 3. Verifying a deployment (P1-T17)

On a preview URL:

```
curl -sI https://<preview>.sprigkit.pages.dev/ | grep -iE "content-security|x-robots|referrer|nosniff|permissions|cross-origin"
curl -sI https://<preview>.sprigkit.pages.dev/does-not-exist   # expect 404
curl -sI https://<preview>.sprigkit.pages.dev/index.html       # expect redirect to /
curl -sI https://<preview>.sprigkit.pages.dev/_headers         # expect 404 (not served)
```

Check:
- [ ] CSP and the other security headers are present (architecture §11.1).
- [ ] `X-Robots-Tag: noindex` is present on the preview host.
- [ ] The 404 page returns status 404.
- [ ] Clean URLs work (`/page` serves `page.html`; `/page.html` redirects).
- [ ] DevTools console: no CSP violations on load.
- [ ] (When OG images exist) `/<slug>/opengraph-image` returns `Content-Type: image/png`; otherwise use the build-script fallback (architecture §8.4).

## 4. Rollback (P1-T18)

1. Cloudflare dashboard → the project → **Deployments**.
2. Pick the last good production deployment → **⋯ → Rollback to this deployment**. The switch is instant.
3. Revert the bad commit on `main` (`git revert`), so the next deploy does not bring the problem back.

Test this once in Phase 1 by rolling back to an earlier deployment and then forward again.

## 5. Limits to watch

- 25 MiB per deployed file (largest file today: pdf.js worker, ~1.3 MB).
- 500 builds per month on the free plan. Docs-only pushes still trigger builds; use `[skip ci]`-style messages or build watch paths if this becomes a problem.
- `_headers`: Cloudflare limits the number of rules (100) and the line length (2,000 characters) **[Unverified: from memory of Cloudflare docs; check when the file grows]**.
