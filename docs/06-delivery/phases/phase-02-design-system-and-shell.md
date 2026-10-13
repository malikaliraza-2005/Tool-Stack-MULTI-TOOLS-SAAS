# Phase 2: Design System & App Shell

| | |
|---|---|
| **Status** | 🟨 In progress: all build tasks done (T01–T17, T20); review tasks T18–T19 and owner approval (M2) open |
| **Effort** | 6–8 days [Estimate] |
| **Milestone** | M2: Design system approved |

## Goal
Turn the design system into working tokens and components, build the site shell (header, footer, theme, layout), and approve the look and motion **on the running site** before any tool UI is built.

## Entry criteria
- Phase 1 complete (pipeline, fonts, CSP proven).

## Read first
- [design-system.md](../../02-design/design-system.md) (all)
- [architecture.md §6–7](../../04-architecture/architecture.md#6-folder-structure)

## Deliverables
- All tokens (color, type, spacing, radius, shadow, motion) in CSS and Tailwind `@theme`.
- Component library with every state.
- App shell: header, footer, breadcrumbs, theme toggle, page containers.
- Dev-only **component gallery** route (`/_gallery`, excluded from sitemap, `noindex`, not linked).
- Brand basics (logo mark, favicon, wordmark).

## Tasks

### Foundations
- [x] **P2-T01** Brand basics: wordmark, simple logo mark, favicon set, app icons (OFL/own work only).
- [x] **P2-T02** Color tokens light/dark (design-system §2) incl. status `-soft` variants; **verify contrast** of every text/background pair; adjust values and update the doc.
- [x] **P2-T03** Typography tokens and Geist setup (§3); tabular numerals utility.
- [x] **P2-T04** Spacing, containers, radius, borders, elevation tokens (§4–5).
- [x] **P2-T05** Motion tokens (§7) as CSS variables + a shared Motion config (`LazyMotion` with `domAnimation`, spring presets, reduced-motion handling via `MotionConfig reducedMotion="user"`).
- [x] **P2-T06** Global reduced-motion CSS and focus-ring styles.

### Theme & shell
- [x] **P2-T07** Theme system: Light/Dark/System, inline pre-paint script (no flash), stored preference, View Transition cross-fade (disabled under reduced motion).
- [x] **P2-T08** Root layout: skip link, header (logo, category nav, search trigger, theme toggle), footer (categories, About, Privacy, Terms, Licenses).
- [x] **P2-T09** Page containers and section spacing utilities.
- [x] **P2-T10** Page transition via View Transitions API for same-document navigations where supported.

### Components (each with all states from design-system §8)
- [x] **P2-T11** Button, IconButton, Kbd, Badge, Tooltip.
- [x] **P2-T12** Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Slider, SegmentedControl (sliding indicator).
- [x] **P2-T13** Tabs (sliding underline), DropdownMenu, Popover, Dialog/Sheet (focus trap, restore focus).
- [x] **P2-T14** Toast (sonner, restyled), ProgressBar (determinate/indeterminate), Skeleton, EmptyState, ErrorState.
- [x] **P2-T15** CommandPalette component (cmdk) with static placeholder items (full search in P7).
- [x] **P2-T16** CopyButton (icon morph + announcement).
- [x] **P2-T17** Component gallery page showing every component and state in both themes.

### Review
- [ ] **P2-T18** Review on a **preview deployment**: desktop + mobile (real phone), both themes, keyboard-only, reduced motion, 200% zoom. **Open (owner):** branch not pushed yet. Local production-build checks done (Playwright: both themes, 320px, 200% zoom, reduced motion, keyboard); see [accessibility.md §3](../../02-design/accessibility.md#3-phase-2-results-2026-10-13).
- [ ] **P2-T19** Performance trace of hover/press/dialog/tab animations on a mid-range Android device; fix any jank. **Open (owner, real device).** All animations are transform/opacity only ([motion-design.md §5](../../02-design/motion-design.md#5-verification)).
- [x] **P2-T20** axe on the gallery page: zero violations. Both page themes, all four Playwright projects (`e2e/shell.spec.ts`).

## Docs to write / update
brand-identity.md · motion-design.md · accessibility.md · ui-ux-specification.md (homepage, tool page, workbench, file workspace layouts) · information-architecture.md (sitemap, nav, URLs) · content-voice-ux-copy.md · design-system.md (adjusted token values)

## Exit criteria
- [x] Every component in design-system §8 that is needed before P3 exists with all states. (Tool components — DropZone, FileList, ResultPanel, PrivacyMeter, CodeEditor, ComparisonSlider, PageThumbnailGrid — are built with their tools in P3–P6.)
- [x] Contrast verified for all token pairs in both themes; doc updated (design-system §2.3, enforced by `tokens.test.ts`).
- [ ] Motion rules (design-system §7.4) pass on the running site. Rules 1–6 verified locally on the production build; rule 7 needs the real-device trace (P2-T19).
- [x] No hard-coded design values in components (lint rule `sprigkit/no-hardcoded-design`).
- [ ] Owner approves the visual direction on the preview deployment (M2).

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Direction looks generic once built | Iterate on typography scale, accent use, and the signature elements before moving on; this is the cheapest moment to change |
| View Transitions inconsistent across browsers | Progressive enhancement only; instant navigation where unsupported |
| Motion bundle too large | Keep `LazyMotion` minimal features; use CSS for everything simple |
