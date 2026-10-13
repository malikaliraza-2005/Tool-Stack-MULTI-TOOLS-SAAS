# Phase 1: Setup & Technical Spikes

| | |
|---|---|
| **Status** | 🟨 In progress: code, CI config, spikes and docs done; Cloudflare tasks T15, T17, T18 open |
| **Effort** | 3–5 days [Estimate] |
| **Milestone** | M1: Pipeline live |

## Goal
A clean, deployable project with CI, preview deployments, and security headers, plus proof that the riskiest technical pieces work with Next.js 16 static export.

## Entry criteria
- Phase 0 complete (name and slugs final).

## Read first
- [architecture.md](../../04-architecture/architecture.md) (all)
- [dependencies-licenses.md](../../04-architecture/dependencies-licenses.md)
- [CLAUDE.md](../../../CLAUDE.md)

## Deliverables
- Git repository (GitHub) with scaffolded Next.js 16 app, TypeScript strict, Tailwind 4, ESLint, Prettier.
- Static export building to `out/`.
- CI pipeline on GitHub Actions.
- Cloudflare Pages project: production branch + preview deployments, all non-production deploys `noindex`.
- `public/_headers` with the CSP from architecture §11.1.
- Spike results documented, with chosen approaches.

## Tasks

### Scaffold
- [x] **P1-T01** Initialize git repo; add `.gitignore`, `.editorconfig`, `README.md` (short), license choice for the repo (decide: private repo or open-source parts).
- [x] **P1-T02** Scaffold Next.js 16 (App Router, TypeScript, `src/` dir); configure `output: "export"`, `images.unoptimized`, `trailingSlash: false`.
- [x] **P1-T03** Tailwind CSS 4 setup with an empty token layer (`src/styles/globals.css`).
- [x] **P1-T04** ESLint + Prettier; `typecheck`, `lint` scripts; strict TS options.
- [x] **P1-T05** Folder structure from architecture §6 (empty folders with `.gitkeep` only where needed).
- [x] **P1-T06** `src/config/site.ts` with `SITE_URL` from `NEXT_PUBLIC_SITE_URL`.
- [x] **P1-T07** Pin dependency versions; update [dependencies-licenses.md](../../04-architecture/dependencies-licenses.md) with pinned versions.

### Testing & CI
- [x] **P1-T08** Vitest configured with one sample test.
- [x] **P1-T09** Playwright configured (Chromium, Firefox, WebKit + mobile viewport) running against the built `out/` served statically.
- [x] **P1-T10** **No-network test helper:** fixture that records all requests and fails on any non-same-origin request.
- [x] **P1-T11** @axe-core/playwright helper.
- [x] **P1-T12** Lighthouse CI config with budgets from architecture §14 (warn-only until P9, then enforced).
- [x] **P1-T13** License gate: `license-checker-rseidelsohn` with allow-list from dependencies-licenses §1.
- [x] **P1-T14** GitHub Actions workflow: install → typecheck → lint → test → build → e2e → lhci → licenses.

### Hosting
- [x] **P1-T15** Cloudflare Pages project connected to the repo; build command, output `out`, env `NEXT_PUBLIC_SITE_URL` per environment. Done 2026-10-13: Pages project `sprigkit` (`https://sprigkit.pages.dev`), production branch `main`.
- [x] **P1-T16** `public/_headers`: CSP + security headers; `X-Robots-Tag: noindex` on preview hostnames (or via environment-aware build).
- [ ] **P1-T17** Verify headers on a preview deployment (DevTools / `curl -I`); confirm static pages, 404 page, and clean URLs work. **Open (owner action):** after T15; checklist in [deployment.md §3](../deployment.md#3-verifying-a-deployment-p1-t17).
- [ ] **P1-T18** Test rollback: promote a previous deployment in the dashboard. **Open (owner action):** after T15; steps in [deployment.md §4](../deployment.md#4-rollback-p1-t18).

### Spikes (throwaway code in a `spikes/` branch; record outcomes)
- [x] **P1-T19** **jSquash WASM** in a module worker with Turbopack: encode a JPEG and WebP; confirm WASM files are emitted, self-hosted, and allowed by CSP (`wasm-unsafe-eval`). Fallback: `--webpack` build or WASM in `public/`.
- [x] **P1-T20** **pdf.js worker**: render page 1 of a PDF to canvas in production build under the CSP.
- [x] **P1-T21** **pdf-lib in a worker**: merge two PDFs, transfer `ArrayBuffer`s.
- [x] **P1-T22** **Serwist** PWA with Next 16 static export: precache + offline reload. Record if a webpack build is required.
- [x] **P1-T23** **OG images** in static export: confirm `opengraph-image.tsx` with static params works; fallback build script.
- [x] **P1-T24** **CSP + Next inline scripts**: confirm the site hydrates with the planned CSP; confirm a `fetch()` to another origin is blocked.
- [x] **P1-T25** **Fonts**: Geist via `next/font` self-hosted; no external font requests.
- [x] **P1-T26** Record each spike result (works / workaround / blocked) in [architecture.md](../../04-architecture/architecture.md) §8–§10 and the decision log.

## Docs to write / update
testing-strategy.md · coding-standards.md · deployment.md · performance.md · browser-device-support.md (initial matrix) · architecture.md (spike outcomes) · dependencies-licenses.md (pinned versions) · CLAUDE.md (real commands)

## Exit criteria
- [ ] Push to a branch produces a preview URL; push to `main` produces production (not yet public/announced).
- [x] CI green with all stages running. First run on `main`: GitHub Actions run 38421132375, 2026-10-13, all stages passed.
- [ ] CSP active on deployments; cross-origin fetch blocked in a test.
- [x] Every spike has a recorded, working approach (or an accepted fallback). See [architecture.md §8.4](../../04-architecture/architecture.md#84-phase-1-spike-results).
- [ ] Preview deployments return `noindex`.

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Turbopack can't bundle a worker/WASM setup | Production builds with `next build --webpack` |
| Serwist incompatible with Turbopack | Webpack build, or a small hand-written service worker |
| Inline-script CSP breaks hydration | Keep `'unsafe-inline'` (planned); hashing later |
| GitHub Actions minutes for private repo | Make repo public, or run heavy E2E only on `main` |
