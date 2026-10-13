# Coding Standards

| | |
|---|---|
| **Last updated** | 2026-10-13 (Phase 1: tooling in place) |
| **Related** | [CLAUDE.md](../../CLAUDE.md) · [architecture.md](architecture.md) · [testing-strategy.md](../05-quality/testing-strategy.md) · [design-system.md](../02-design/design-system.md) |

The non-negotiable rules (no backend, no network with user data, licenses, tokens only, motion, accessibility) are in [CLAUDE.md](../../CLAUDE.md#non-negotiable-rules). This document covers how code is written and checked.

## 1. Tooling (enforced in CI)

| Concern | Tool / setting |
|---|---|
| Node.js | 24 (`.node-version`) |
| Package versions | Exact pins (`.npmrc` `save-exact=true`); lockfile committed; `npm ci` in CI |
| Types | TypeScript 5.9, `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` |
| Lint | ESLint 9 flat config: `eslint-config-next` (core-web-vitals + TypeScript) + `eslint-config-prettier`; **zero warnings** (`--max-warnings=0`) |
| Format | Prettier 3, `printWidth: 100`, other defaults; `.editorconfig` (2 spaces, LF, UTF-8); `.gitattributes` normalizes line endings to LF |
| Bundler | webpack via `--webpack` (D-14) |

Run before pushing: `npm run typecheck && npm run lint && npm run format:check && npm run test`.

## 2. TypeScript

- No `any` without a comment explaining why. Prefer `unknown` and narrow.
- With `noUncheckedIndexedAccess`, indexed reads are `T | undefined`; handle the `undefined` case instead of using `!`, except where the index is provably valid (and say so in a comment if it is not obvious).
- Types next to the code that owns them; shared tool types in `src/tools/types.ts`.
- Validate external input (stored preferences, registry) with Zod at the boundary.

## 3. Files and naming

- Components: PascalCase files (`DropZone.tsx`). Hooks: `useX.ts`. Utilities: camelCase.
- Route files in `src/app/` stay thin: they import from `src/components/` and `src/tools/`.
- Per tool: `meta.ts` · `content.tsx` · `ui.tsx` · `logic.ts` · `logic.worker.ts` · `logic.test.ts` ([architecture.md §6](architecture.md#6-folder-structure)). `meta.ts` and `content.tsx` never import heavy libraries.
- Import from `@/…` (maps to `src/`), not long relative paths across folders.

## 4. React and Next.js

- Server components by default. Add `"use client"` only to the interactive leaf.
- Use only features that work in static export ([architecture.md §3](architecture.md#3-static-export)). No `next/image` optimization, no route handlers that read the request, no Server Actions.
- Workers: `new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" })`, created through `src/lib/worker` (Phase 3). Pass files as transferable `ArrayBuffer`s.
- Heavy libraries: dynamic `import()` on intent (file selected or input entered).
- Never use `dangerouslySetInnerHTML` with user content.

## 5. Styling

- Tailwind utilities that resolve to design tokens (`bg-surface`, `text-fg-muted`, …). No hard-coded colors, sizes, radii, shadows, durations or easings ([design-system.md §12](../02-design/design-system.md#12-implementation-notes-tailwind-4)).
- Tokens live in `src/styles/globals.css`. Tailwind's default palette, type sizes, radii, shadows and easings are removed, and the `sprigkit/no-hardcoded-design` ESLint rule rejects arbitrary values with literal colors, lengths or times, numeric `duration-*`, and literal values in `style` objects.
- Don't pass classes that conflict with a component's own (e.g. `px-0` onto a button with `px-4`): `cn()` does not merge, so CSS order decides. Add a prop instead (`iconOnly`, `placement`, `width`).
- Don't use Tailwind's `dark:` variant in components; tokens switch with the theme.
- Radix uses boolean data attributes (`data-disabled`, `data-highlighted`): use `data-disabled:`. cmdk sets `"true"`/`"false"`: use `data-[disabled=true]:`.

## 6. Comments

- Explain **why**, not what. Reference the doc section or decision when code follows a non-obvious rule (e.g. `// D-14`, `// architecture §8.4`).
- Match the comment density of the surrounding code.

## 7. Commits and branches

- Imperative subject ≤ 72 characters, prefixed with task IDs: `P3-T07: Add merge-pdf worker`.
- `main` is always deployable (CI green). Work on branches; every branch gets a Cloudflare preview.
- Update affected documents in the same commit as the code ([docs/README.md](../README.md)).

## 8. Adding a dependency

Follow [dependencies-licenses.md §6](dependencies-licenses.md#6-adding-or-updating-a-dependency): check license and size, pin the exact version, add a row to the register, and make sure `npm run licenses` passes.

## 9. Contribution steps

1. Read the current phase file and the docs it lists.
2. Branch from `main`.
3. Write the code and its tests (unit for logic, E2E through `e2e/fixtures.ts` for user flows).
4. `npm run typecheck && npm run lint && npm run format:check && npm run test`, then `npm run build && npm run e2e` for anything touching pages, workers or bundling.
5. For UI or motion: check the running app in both themes, at mobile width, keyboard only and with reduced motion.
6. Commit with the task ID and tick the task in the phase file.
