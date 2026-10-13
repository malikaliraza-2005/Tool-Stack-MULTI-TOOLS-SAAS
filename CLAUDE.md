# CLAUDE.md: Sprigkit

Instructions for AI coding sessions in this repository. Read this first, every session.

## What Sprigkit is

A collection of private, browser-based tools (PDF, image, developer). **All processing happens in the user's browser; nothing is uploaded.** Premium design and motion are core requirements, not polish. Zero budget: no paid services.

Full context: [docs/README.md](docs/README.md).

## Current phase

**Phase 1: Setup & technical spikes** → [docs/06-delivery/phases/phase-01-setup-and-spikes.md](docs/06-delivery/phases/phase-01-setup-and-spikes.md)

Carried over from Phase 0 (owner actions, see [risks-and-decisions.md](docs/06-delivery/risks-and-decisions.md)): register `sprigkit.com` (D-1); manual trademark search for "Sprigkit" (D-5); manual Google Trends check before the first production deploy (P0-T05).

Work from the current phase's task checklist. Tick tasks when done and reference task IDs in commits (e.g. `P3-T07: …`). When a phase's exit criteria all pass, update the status in [docs/06-delivery/phases/README.md](docs/06-delivery/phases/README.md) and this section. Master plan: [implementation-roadmap.md](docs/06-delivery/implementation-roadmap.md).

## Non-negotiable rules

1. **No backend, database, API routes, auth, or paid service.** The site is a Next.js static export (`output: "export"`).
2. **No network requests with user data.** Tools must not call any external origin. Never load libraries, fonts, or WASM from a CDN; self-host everything.
3. **Only permissive licenses.** Allowed: MIT, ISC, BSD, Apache-2.0, OFL (fonts). LGPL/MPL need review. GPL, AGPL, and non-commercial licenses are forbidden. Record every new dependency in [docs/04-architecture/dependencies-licenses.md](docs/04-architecture/dependencies-licenses.md).
4. **Never store user content** (files, text, tokens) in localStorage, URLs, logs, or analytics. Only preferences/options.
5. **Use design tokens only.** No hard-coded colors, sizes, radii, shadows, durations, or easings. See [docs/02-design/design-system.md](docs/02-design/design-system.md).
6. **Motion:** animate `transform`/`opacity`; respect `prefers-reduced-motion`; never block input; durations from tokens (≤ 380ms).
7. **Accessibility:** keyboard-operable everything (including drag-and-drop alternatives), visible focus, labelled controls, WCAG 2.2 AA contrast.
8. **Do not create documentation, new tools, or features beyond what the task asks.** If a doc needs to change because of your work, update it in the same change and say so.

## Which doc to read for which task

| Task                                      | Read                                                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any tool work                             | [tool-specifications.md](docs/04-architecture/tool-specifications.md) (the tool's section + §2 shared behaviour) and [tool-registry.md](docs/04-architecture/tool-registry.md) |
| Structure, routing, workers, CSP, PWA, CI | [architecture.md](docs/04-architecture/architecture.md)                                                                                                                        |
| UI, styling, components, motion           | [design-system.md](docs/02-design/design-system.md)                                                                                                                            |
| Is X in scope?                            | [mvp-scope.md](docs/01-product/mvp-scope.md)                                                                                                                                   |
| Adding a package                          | [dependencies-licenses.md](docs/04-architecture/dependencies-licenses.md)                                                                                                      |
| Product intent, decisions                 | [product.md](docs/01-product/product.md)                                                                                                                                       |
| What to build next                        | Current phase file (above) and [implementation-roadmap.md](docs/06-delivery/implementation-roadmap.md)                                                                         |

If documents disagree, the more specific one wins (see [docs/README.md](docs/README.md)). Point out the conflict to the user.

## Stack

Next.js 16 (App Router, static export, **webpack** builds via `--webpack`, not Turbopack: D-14) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui on Radix · Motion for React (`LazyMotion` + `m`) · lucide-react · CodeMirror 6 · Fuse.js · Zod · Serwist (PWA) · Vitest · Playwright + axe · Lighthouse CI · Cloudflare Pages.

Workers: `new Worker(new URL("./x.worker.ts", import.meta.url), { type: "module" })`; proven patterns for WASM, pdf.js, pdf-lib and Serwist are in [architecture.md §8.4](docs/04-architecture/architecture.md#84-phase-1-spike-results) (spike code on the local `spikes` branch).

Not available in static export, do not use: middleware/proxy, Server Actions, runtime route handlers, ISR, `cookies()`/`headers()`, `headers`/`redirects`/`rewrites` in `next.config`. Use `public/_headers` and `public/_redirects` instead.

## Commands

Node.js 24 (`.node-version`). Exact versions are pinned (`.npmrc` `save-exact=true`).

```
npm run dev          # local dev server (http://localhost:3000)
npm run build        # static export to out/
npm run serve        # serve out/ like Cloudflare Pages (clean URLs, 404, public/_headers) on :4173
npm run typecheck
npm run lint         # ESLint, zero warnings
npm run format       # Prettier (format:check in CI)
npm run test         # Vitest unit tests
npm run e2e          # Playwright against out/ (needs build; incl. no-network, CSP and axe checks)
npm run lhci         # Lighthouse CI budgets (needs build; warn-only until P9)
npm run licenses     # license gate (scripts/check-licenses.mjs)
```

E2E tests import `test`/`expect` from `e2e/fixtures.ts`: every test automatically fails on a cross-origin request, a CSP violation, or an uncaught page error. Use `expectNoA11yViolations(page)` for axe.

## Code layout

```
src/app/            routes only (thin)
src/components/     ui/ (shadcn), layout/, tool/ (shared tool UI), home/
src/tools/<slug>/   meta.ts · content.tsx · ui.tsx · logic.ts · logic.worker.ts · logic.test.ts
src/tools/registry.ts
src/lib/            worker/, files/, detect/, storage.ts, seo.ts, errors.ts
src/config/site.ts  SITE_URL (from NEXT_PUBLIC_SITE_URL)
e2e/                Playwright tests
```

- `meta.ts` and `content.tsx`: **no heavy imports** (they load on every build/page).
- `logic.ts`: pure functions, no DOM/React; fully unit-tested.
- Heavy work (PDF, image codecs, large text, regex) runs in a Web Worker via `src/lib/worker` with cancellation; regex always with a 1s timeout.
- Heavy libraries load **on intent** (file selected / input entered), never on page load.
- Errors use the `ToolError` codes in tool-specifications §2.4, with specific, helpful messages.
- Detect file types by magic bytes, not extension.
- Never render user-provided HTML/SVG inline.

## Adding a tool

Follow [tool-registry.md §7](docs/04-architecture/tool-registry.md#7-adding-a-new-tool-checklist). Done means the Definition of Done in [mvp-scope.md §6](docs/01-product/mvp-scope.md#6-definition-of-done-per-tool) is met, including the E2E **no-network** assertion.

## Before saying a task is done

- `typecheck`, `lint`, `test` pass; run `build` for anything affecting routes, metadata, or bundling.
- For UI or motion changes: check it in the running app (both themes, mobile width, keyboard only, reduced motion). Don't judge visual quality from code alone.
- Report honestly what was verified and what was not.

## Conventions

- TypeScript strict; no `any` without a comment explaining why.
- Components: PascalCase files; hooks `useX`; utilities camelCase.
- Match the surrounding code's style and comment density.
- Commit messages: imperative mood, concise subject (≤ 72 chars).
