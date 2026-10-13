# Motion Design

| | |
|---|---|
| **Last updated** | 2026-10-13 (Phase 2) |
| **Related** | [design-system.md §7](design-system.md#7-motion) (tokens and binding rules) · [accessibility.md](accessibility.md) |

The tokens and the seven acceptance rules in design-system §7 are binding. This document records **how each interaction moves** and which technique implements it. Tool-specific choreography (drop zone, file list reorder, result reveal, comparison slider) is added in Phases 3–6 when those components are built.

## 1. Techniques

| Technique | Used for | Why |
|---|---|---|
| CSS transitions (`transition-control`) | Hover, press, focus, toggles, icon morphs | Cheapest; runs on the compositor for `transform`/`opacity` |
| CSS keyframes on Radix `data-state` | Dialog, sheet, popover, dropdown, select, tooltip, toast | Radix delays unmount until `animationend`, so exits animate without a presence library |
| Motion `m` + `layoutId` | Sliding indicators (SegmentedControl pill, Tabs underline); later drag/reorder | Layout animation between two positions needs measurement (FLIP); Motion animates it with transforms |
| View Transitions API | Theme change, page navigation | Progressive enhancement; instant elsewhere |

**Motion bundle.** `LazyMotion strict` + `m` only. The `domMax` feature set is loaded asynchronously (`src/components/motion/features.ts`) after hydration; until it arrives, indicators simply jump. `domMax` rather than `domAnimation` because `layoutId` needs layout features.

## 2. Choreography

| Interaction | Property | Duration / easing | Distance / scale | Reduced motion |
|---|---|---|---|---|
| Button / control hover | color, background, border | `--dur-quick`, `--ease-out` | — | instant |
| Button press | transform | `--dur-instant`, `--ease-out` | scale 0.98 | instant |
| Switch thumb | transform | `--dur-instant` | 16px travel | instant |
| Checkbox / radio state | background, border | `--dur-quick` | — | instant |
| Tooltip, popover, menu, select open | opacity + transform | `--dur-quick`, `--ease-out` | from scale 0.96, origin at trigger | instant |
| …close | opacity + transform | `--dur-exit` (120ms), `--ease-in` | to scale 0.98 | instant |
| Dialog open (`sm`+) | opacity + transform | `--dur-standard`, `--ease-out` | rise 8px, from scale 0.98 | instant |
| Dialog close | opacity + transform | `--dur-exit`, `--ease-in` | 4px | instant |
| Bottom sheet (mobile dialog) / side sheet | transform | `--dur-standard` in, `--dur-exit` out | full height/width (enters from the edge it is attached to) | instant |
| Overlay backdrop | opacity | `--dur-quick` in, `--dur-exit` out | — | instant |
| SegmentedControl pill, Tabs underline | layout (transform) | `--dur-standard`, `--ease-in-out` | between options | no animation (`reducedMotion="user"`) |
| Tab panel change | opacity | `--dur-quick` | — | instant |
| CopyButton icon morph | opacity + transform | `--dur-quick` / `--dur-instant` | copy icon to scale 0.5 out, check from 0.5 in; reverts after 1.5s | instant |
| Progress (determinate) | transform `scaleX` | `--dur-standard` | — | instant |
| Progress (indeterminate) | transform loop | `--dur-loop` × 2 | 40% bar sweeps across | static full bar at 50% opacity |
| Spinner | rotate loop | `--dur-loop` | — | static |
| Skeleton | opacity pulse | `--dur-loop` × 2 | — | static |
| Theme change | View Transition cross-fade of the whole page | `--dur-page`, `--ease-out` | — | skipped (no `startViewTransition` call) |
| Page navigation | View Transition: old page fades out, new page fades in and rises | out `--dur-exit`; in `--dur-page` | rise 6px | animation removed by CSS (instant swap) |

## 3. Page transitions

- `src/app/template.tsx` wraps every page in React 19.3's `<ViewTransition enter="page-enter" exit="page-exit" default="none">`. Templates re-mount on each navigation, so the old page exits and the new one enters. Next.js 16 navigations are React transitions, which start the View Transition automatically.
- The header has `view-transition-name: site-header` and no animation: it is the fixed spatial anchor while content changes.
- `::view-transition { pointer-events: none }` keeps the page clickable during the transition (rule 2).
- During a theme change the header's transition name is removed (`data-theme-transition`), so it cross-fades with the rest of the page.
- Without View Transition support the swap is instant.

## 4. Reduced motion

`@media (prefers-reduced-motion: reduce)` in `globals.css` collapses every CSS transition and keyframe to 0.01ms, runs loops once, and removes all View Transition animations. Motion's `MotionConfig reducedMotion="user"` disables transform and layout animations. Loading indicators switch to static forms (`motion-reduce:` utilities). The theme toggle skips `startViewTransition` entirely (verified by `e2e/shell.spec.ts`).

## 5. Verification

| Rule (design-system §7.4) | How it is checked |
|---|---|
| 1. transform/opacity only | Code review: all keyframes in `globals.css` animate `transform`/`opacity`; `transition-control` only transitions colors, opacity and transform |
| 2. Never blocks input | Overlays are dismissable mid-animation (Radix); View Transition overlay has `pointer-events: none` |
| 3. Exits faster | `--dur-exit` 120ms < every entrance |
| 4. No perpetual animation | Only loading indicators loop, and they unmount when work ends |
| 5. Reduced motion | Global CSS + MotionConfig; E2E test for the theme transition |
| 6. Focus placement | Radix focus trap and restore; palette restores focus manually (no trigger element); E2E tests |
| 7. Smooth on mid-range devices | Owner trace on a mid-range Android phone (P2-T19, 2026-10-13); no jank reported |
