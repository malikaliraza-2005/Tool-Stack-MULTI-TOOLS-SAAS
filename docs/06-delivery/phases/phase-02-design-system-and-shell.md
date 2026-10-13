# Phase 2: Design System & App Shell

| | |
|---|---|
| **Status** | ⬜ Not started |
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
- [ ] **P2-T01** Brand basics: wordmark, simple logo mark, favicon set, app icons (OFL/own work only).
- [ ] **P2-T02** Color tokens light/dark (design-system §2) incl. status `-soft` variants; **verify contrast** of every text/background pair; adjust values and update the doc.
- [ ] **P2-T03** Typography tokens and Geist setup (§3); tabular numerals utility.
- [ ] **P2-T04** Spacing, containers, radius, borders, elevation tokens (§4–5).
- [ ] **P2-T05** Motion tokens (§7) as CSS variables + a shared Motion config (`LazyMotion` with `domAnimation`, spring presets, reduced-motion handling via `MotionConfig reducedMotion="user"`).
- [ ] **P2-T06** Global reduced-motion CSS and focus-ring styles.

### Theme & shell
- [ ] **P2-T07** Theme system: Light/Dark/System, inline pre-paint script (no flash), stored preference, View Transition cross-fade (disabled under reduced motion).
- [ ] **P2-T08** Root layout: skip link, header (logo, category nav, search trigger, theme toggle), footer (categories, About, Privacy, Terms, Licenses).
- [ ] **P2-T09** Page containers and section spacing utilities.
- [ ] **P2-T10** Page transition via View Transitions API for same-document navigations where supported.

### Components (each with all states from design-system §8)
- [ ] **P2-T11** Button, IconButton, Kbd, Badge, Tooltip.
- [ ] **P2-T12** Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Slider, SegmentedControl (sliding indicator).
- [ ] **P2-T13** Tabs (sliding underline), DropdownMenu, Popover, Dialog/Sheet (focus trap, restore focus).
- [ ] **P2-T14** Toast (sonner, restyled), ProgressBar (determinate/indeterminate), Skeleton, EmptyState, ErrorState.
- [ ] **P2-T15** CommandPalette component (cmdk) with static placeholder items (full search in P7).
- [ ] **P2-T16** CopyButton (icon morph + announcement).
- [ ] **P2-T17** Component gallery page showing every component and state in both themes.

### Review
- [ ] **P2-T18** Review on a **preview deployment**: desktop + mobile (real phone), both themes, keyboard-only, reduced motion, 200% zoom.
- [ ] **P2-T19** Performance trace of hover/press/dialog/tab animations on a mid-range Android device; fix any jank.
- [ ] **P2-T20** axe on the gallery page: zero violations.

## Docs to write / update
brand-identity.md · motion-design.md · accessibility.md · ui-ux-specification.md (homepage, tool page, workbench, file workspace layouts) · information-architecture.md (sitemap, nav, URLs) · content-voice-ux-copy.md · design-system.md (adjusted token values)

## Exit criteria
- [ ] Every component in design-system §8 that is needed before P3 exists with all states.
- [ ] Contrast verified for all token pairs in both themes; doc updated.
- [ ] Motion rules (design-system §7.4) pass on the running site.
- [ ] No hard-coded design values in components (lint rule or code review).
- [ ] Owner approves the visual direction on the preview deployment (M2).

## Risks & fallbacks
| Risk | Fallback |
|---|---|
| Direction looks generic once built | Iterate on typography scale, accent use, and the signature elements before moving on; this is the cheapest moment to change |
| View Transitions inconsistent across browsers | Progressive enhancement only; instant navigation where unsupported |
| Motion bundle too large | Keep `LazyMotion` minimal features; use CSS for everything simple |
