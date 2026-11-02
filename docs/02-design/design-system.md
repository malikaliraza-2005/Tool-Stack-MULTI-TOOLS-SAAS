# Design System

| | |
|---|---|
| **Last updated** | 2026-10-13 |
| **Status** | v0.2 (Phase 2). Tokens implemented in `src/styles/globals.css`; color values adjusted for contrast (§2.3). Visual direction approved by the owner (M2, 2026-10-13) |
| **Related** | [product.md](../01-product/product.md) · [architecture.md](../04-architecture/architecture.md) |

This document defines Sprigkit's visual identity and the rules every screen follows. **Never hard-code a color, size, radius, shadow, duration, or easing in a component; always use a token.**

---

## 1. Art direction: "Precision instrument"

Sprigkit should feel like well-made audio gear or a fine camera: **calm, exact, confident, and tactile.** It is a professional instrument, not a marketing page.

| Principle | Means | Avoid |
|---|---|---|
| **Precise** | Fine 1px rules, aligned grids, tabular numbers, exact labels | Random spacing, decorative clutter |
| **Calm** | Warm neutrals, one accent, generous whitespace | Rainbow gradients, glassmorphism, loud colors |
| **Tactile** | Controls respond instantly to hover and press; drag feels physical | Flat, unresponsive forms |
| **Honest** | Clear states, real progress, plain language | Fake loaders, vague errors, dark patterns |
| **Fast** | The tool is above the fold; motion never delays the user | Long intros, entrance animations that block input |

**Signature elements**
1. **The instrument hero:** the homepage hero *is* the product: a large command field and drop zone.
2. **The privacy meter:** a small, precise "0 bytes uploaded" readout, styled like an instrument display (mono numerals, subtle indicator dot).
3. **The index:** categories presented like a well-typeset table of contents, not a grid of identical cards.

---

## 2. Color

All colors use **OKLCH** (perceptually even; supported in all current browsers). Every text/background and UI-boundary pair is checked against WCAG 2.2 AA by `src/styles/tokens.test.ts` (runs in CI); changing a value that breaks a pair fails the build.

### 2.1 Semantic tokens

| Token | Role | Light | Dark |
|---|---|---|---|
| `--bg` | Page background ("paper" / "graphite") | `oklch(0.985 0.004 85)` | `oklch(0.165 0.005 70)` |
| `--surface` | Cards, panels, tool workspace | `oklch(1 0 0)` | `oklch(0.205 0.006 70)` |
| `--surface-2` | Inset areas, input backgrounds, hover rows | `oklch(0.965 0.006 85)` | `oklch(0.245 0.006 70)` |
| `--surface-3` | Pressed states, selected rows | `oklch(0.935 0.008 85)` | `oklch(0.285 0.007 70)` |
| `--fg` | Primary text ("ink") | `oklch(0.22 0.012 70)` | `oklch(0.955 0.005 85)` |
| `--fg-muted` | Secondary text | `oklch(0.48 0.012 70)` | `oklch(0.72 0.01 80)` |
| `--fg-subtle` | Placeholders, helper icons, disabled text | `oklch(0.54 0.01 75)` | `oklch(0.66 0.008 75)` |
| `--border` | Default 1px rules | `oklch(0.9 0.006 85)` | `oklch(0.3 0.006 70)` |
| `--border-strong` | Input, checkbox, radio and switch boundaries (≥ 3:1) | `oklch(0.63 0.008 80)` | `oklch(0.53 0.008 70)` |
| `--accent` | "Signal" accent: primary actions, focus, active indicators | `oklch(0.56 0.18 47)` | `oklch(0.72 0.17 48)` |
| `--accent-hover` | Accent hover | `oklch(0.53 0.17 45)` | `oklch(0.76 0.16 50)` |
| `--accent-fg` | Text/icons on accent fills | `oklch(0.99 0.005 85)` | `oklch(0.17 0.01 60)` |
| `--accent-text` | Accent used **as text** on bg (links) | `oklch(0.53 0.17 38)` | `oklch(0.78 0.14 52)` |
| `--accent-soft` | Tinted backgrounds (selected, highlights) | `oklch(0.95 0.035 55)` | `oklch(0.28 0.05 45)` |
| `--success` | Success state | `oklch(0.51 0.13 150)` | `oklch(0.72 0.14 150)` |
| `--warning` | Warning state | `oklch(0.53 0.12 70)` | `oklch(0.8 0.14 80)` |
| `--danger` | Error, destructive actions | `oklch(0.55 0.2 27)` | `oklch(0.7 0.18 25)` |
| `--danger-hover` | Danger button hover | `oklch(0.5 0.19 27)` | `oklch(0.74 0.16 25)` |
| `--danger-fg` | Text/icons on danger fills | `oklch(0.99 0.005 85)` | `oklch(0.17 0.01 60)` |
| `--info` | Informational | `oklch(0.52 0.12 245)` | `oklch(0.74 0.11 245)` |
| `--focus-ring` | Keyboard focus ring | = `--accent` | = `--accent` |
| `--overlay` | Dialog backdrop | `oklch(0.2 0.01 70 / 0.4)` | `oklch(0 0 0 / 0.6)` |

Each status color also gets a `-soft` background variant, derived the same way as `--accent-soft`:

| Token | Light | Dark |
|---|---|---|
| `--success-soft` | `oklch(0.955 0.03 150)` | `oklch(0.28 0.05 150)` |
| `--warning-soft` | `oklch(0.955 0.04 80)` | `oklch(0.28 0.05 80)` |
| `--danger-soft` | `oklch(0.955 0.03 25)` | `oklch(0.28 0.05 25)` |
| `--info-soft` | `oklch(0.955 0.025 245)` | `oklch(0.28 0.05 245)` |

### 2.2 Usage rules
- **One accent.** `--accent` is reserved for the primary action on a screen, focus, active navigation, and progress. Never use it for decoration.
- Status colors are never the **only** signal; always pair them with an icon and text.
- Diff and regex highlights use `-soft` backgrounds with readable `--fg` text.
- Dark mode is **graphite**, not pure black; it reduces glare and keeps depth visible.

### 2.3 Contrast verification (Phase 2, P2-T02)

Checked 2026-10-13 with `src/styles/tokens.test.ts` (OKLCH → sRGB → WCAG relative luminance). Pairs and minimums: `--fg` and `--fg-muted` on every background (4.5:1); `--fg-subtle` on `--bg`, `--surface`, `--surface-2` (4.5:1, because placeholders are text); `--accent-text` on backgrounds and `--accent-soft` (4.5:1); `--accent-fg` on `--accent`/`--accent-hover` and `--danger-fg` on `--danger`/`--danger-hover` (4.5:1); each status color on `--bg`, `--surface` and its `-soft` (4.5:1); `--fg` on every `-soft` (4.5:1); `--accent` (focus ring, indicators) and `--border-strong` (control boundaries) on backgrounds (3:1). All pass in both themes.

Values changed from v0.1 because they failed:

| Token (light unless noted) | v0.1 | Problem | v0.2 |
|---|---|---|---|
| `--accent` | `0.64 0.19 42` | White text on it 3.5:1 | `0.575 0.18 47` (hue nudged towards orange so it stays distinct from `--danger`) |
| `--accent-hover` | `0.6 0.19 40` | White text 4.2:1 | `0.53 0.17 45` |
| `--fg-subtle` | `0.62` (light), `0.56` (dark) | Placeholder 3.3:1 / 3.5:1 | `0.54` / `0.66` |
| `--border-strong` | `0.82` (light), `0.38` (dark) | Input boundary 1.6:1 (WCAG 1.4.11 needs 3:1) | `0.63` / `0.53` |
| `--success` | `0.55` | 4.4:1 on `--bg` | `0.51` |
| `--warning` | `0.62 0.14 75` | 3.6:1 on `--bg` | `0.53 0.12 70` |
| `--info` | `0.55` | 4.2:1 on `--info-soft` | `0.52` |
| `--accent` (Phase 4) | `0.575 0.18 47` | `--accent-fg` on it 4.56:1, rendered 4.44:1 in Firefox (axe failure in CI) | `0.56 0.18 47` (4.84:1); the token test now requires 4.7:1 for text on accent fills |

Disabled controls use 50% opacity and are exempt from contrast (WCAG 1.4.3).

---

## 3. Typography

**[Decision]** **Geist Sans** for UI and content, **Geist Mono** for code, data, numbers in instruments, and keyboard hints. Both SIL Open Font License 1.1 (free for commercial use). Self-hosted via `next/font`; no external font requests.

### 3.1 Type scale

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-display` | 64 / 68 px (`clamp(2.75rem, 6vw, 4rem)`) | 600, tracking −0.03em | Homepage hero only |
| `text-h1` | 40 / 46 px (`clamp(2rem, 4vw, 2.5rem)`) | 600, tracking −0.02em | Page H1 |
| `text-h2` | 28 / 34 px | 600, tracking −0.015em | Section headings |
| `text-h3` | 20 / 28 px | 600 | Sub-sections, panel titles |
| `text-body-lg` | 18 / 28 px | 400 | Intros, lead paragraphs |
| `text-body` | 16 / 26 px | 400 | Default text, content pages |
| `text-ui` | 14 / 20 px | 500 | Buttons, labels, controls |
| `text-small` | 13 / 18 px | 400 | Helper text, metadata |
| `text-micro` | 12 / 16 px | 500, tracking +0.02em, uppercase optional | Overlines, badges |
| `text-code` | 14 / 22 px, Geist Mono | 400 | Editors, outputs |

Implemented as Tailwind `--text-*` theme tokens (size, line height, tracking and weight together), so `text-h2` sets all four. `text-code` sets size only: pair it with `font-mono`.

### 3.2 Rules
- Body text measure: **60–75 characters** (`max-w-prose` = 65ch).
- Numbers that change (sizes, counts, timers, the privacy meter) use `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`).
- Text inputs use `text-body` (16px), which also stops iOS from zooming on focus.
- Minimum body size 16px on content pages; 14px only for UI controls.
- No more than **three sizes** in a single component.

---

## 4. Spacing, layout, and grid

### 4.1 Spacing scale (4px base)
`0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px), 32 (128px)`. Use Tailwind's default spacing scale (which is 4px-based); do not invent values.

### 4.2 Containers

| Token | Max width | Use |
|---|---|---|
| `container-content` | 720px | Articles, guides, supporting content |
| `container-tool` | 1200px | Tool workspaces |
| `container-wide` | 1360px | Homepage, hubs |

Side gutter: 16px (mobile), 24px (tablet), 32px (desktop) via `--gutter`. Use the `Container` component (`size="content" | "tool" | "wide"`) or the `page-container` utility with `max-w-content|tool|wide`. Overlay widths: `--container-popover` 18rem, `--container-dialog` 32rem, `--container-palette` 40rem. Header height: `--header-height` 64px.

### 4.3 Breakpoints
Tailwind defaults: `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`. Design mobile-first; every screen works from **320px** wide with no horizontal page scroll.

### 4.4 Vertical rhythm
- Between page sections: `--section-gap` = 56px mobile, 80px from `md`, 96px from `lg` (`section-y` padding or `section-stack` gap utilities; `Section` component).
- Between a heading and its content: 12–16px.
- Inside panels: 16px (compact) or 24px (default) padding.

---

## 5. Shape, borders, and depth

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Badges, small chips, kbd hints |
| `--radius-md` | 10px | Buttons, inputs, menu items |
| `--radius-lg` | 14px | Panels, cards, dialogs |
| `--radius-xl` | 20px | Hero drop zone, large feature surfaces |
| `--radius-full` | 9999px | Pills, toggles, avatars |

**Borders:** 1px `--border` is the default way to separate surfaces. Use borders before shadows. Controls whose boundary identifies them (inputs, checkboxes, radios, switch track) use `--border-strong`.

**Elevation:** only three levels.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--shadow-1` | `0 1px 2px oklch(0.2 0.01 70 / 0.06)` | none (use border) | Resting cards |
| `--shadow-2` | `0 4px 16px -4px oklch(0.2 0.01 70 / 0.12)` | `0 4px 16px -4px oklch(0 0 0 / 0.5)` | Popovers, dropdowns, dragged items |
| `--shadow-3` | `0 16px 48px -12px oklch(0.2 0.01 70 / 0.2)` | `0 16px 48px -12px oklch(0 0 0 / 0.6)` | Dialogs, command palette |

**Backgrounds:** solid `--bg`. A single, very subtle background detail is allowed on the homepage hero only (e.g. a fine dot grid at ≤4% contrast, static). No animated gradients, no blobs, no glassmorphism. *As built:* the `bg-dot-grid` utility (`--border` dots on a 24px grid, masked to fade out from the top).

---

## 6. Iconography

- **Lucide** icons (ISC license), 1.5px stroke, sizes 16 / 20 / 24px.
- Icons accompany labels; icon-only buttons must have an accessible name and a tooltip.
- One icon per concept across the whole site (e.g. always the same "download" icon).
- Category marks (PDF, Image, Developer) are simple custom glyphs built from the same stroke style.

---

## 7. Motion

Motion explains change: where something came from, what happened, what to do next. Full choreography will be in `motion-design.md`; these tokens and rules are binding now.

### 7.1 Duration tokens

| Token | Duration | Use |
|---|---|---|
| `--dur-instant` | 100ms | Press feedback, toggles, checkbox, copy confirmation |
| `--dur-quick` | 180ms | Hover, tooltip, popover, menu |
| `--dur-standard` | 260ms | Dialog, panel, result reveal, tab change |
| `--dur-page` | 380ms | Page and theme transitions (maximum) |
| `--dur-exit` | 120ms | Exits of overlays and pages (rule 3: faster than entrances) |
| `--dur-loop` | 900ms | Loop period of loading indicators only (spinner; indeterminate bar ×2). Not a transition duration; stops when work ends |
| `--dur-stagger` | 40ms | Delay between staggered entrances (§7.3). The `stagger` utility multiplies it by `--stagger-index` (0–5); reduced motion drops the delay. Used with `animate-rise-in` (8px rise, `--dur-standard`) |

Use them as `duration-(--dur-quick)` in Tailwind; the `transition-control` utility applies `--dur-quick` to color changes and `--dur-instant` to transforms (press). The same values are mirrored for Motion in `src/lib/motion.ts` (kept equal by `tokens.test.ts`).

### 7.2 Easing tokens

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances, reveals, most UI |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Moving between two on-screen positions |
| `--ease-in` | `cubic-bezier(0.55, 0, 1, 0.45)` | Exits (use shorter duration than the entrance) |
| Spring (Motion) | `{ type: "spring", stiffness: 500, damping: 40, mass: 1 }` | Drag, reorder, direct manipulation only |

### 7.3 Distance and stagger
- Entrance travel: **≤ 12px** (usually 6–8px). Exits travel ≤ 6px.
- Scale for press: `0.98`. Scale for popover entrance: from `0.96`.
- Stagger: **≤ 40ms** per item, maximum ~6 items staggered; the rest appear together.

### 7.4 Rules (acceptance criteria)
1. Frequent animations use only `transform` and `opacity` (plus `clip-path` or `filter` sparingly, never on large areas).
2. No animation blocks input. Users can type, click, or navigate during any transition.
3. Exits are faster than entrances.
4. No perpetual animation in content areas. Loading indicators stop the moment work ends.
5. `prefers-reduced-motion: reduce` → movement and scale are replaced by opacity fades ≤ 150ms or no animation; View Transitions are disabled.
6. Focus stays visible and correctly placed through every transition (dialogs restore focus on close).
7. Smooth on a mid-range Android phone and a 4-year-old laptop, verified with DevTools performance traces on the **running site**.

### 7.5 Technology
| Layer | Tool |
|---|---|
| Hover, press, focus, small state changes | CSS transitions with the tokens above |
| Page and theme transitions | View Transitions API (progressive enhancement) |
| Overlay enter/exit (dialog, sheet, popover, menu, tooltip) | CSS keyframes on Radix `data-state` (`animate-pop-in`, `animate-dialog-in`, …). Radix waits for `animationend` before unmounting, so no presence library is needed |
| Layout animation (sliding indicators), reorder, drag | Motion for React via `LazyMotion` + `m`. Features are `domMax` (layout animations need it), **loaded asynchronously** after hydration so the initial bundle only carries `m`. `MotionConfig reducedMotion="user"` |

Choreography per interaction: [motion-design.md](motion-design.md).

---

## 8. Components

Built on Radix primitives via shadcn/ui where suitable, **restyled entirely** with Sprigkit tokens. Each component must define all states below.

**Standard states:** default · hover · active (pressed) · focus-visible · disabled · loading (where relevant) · error (where relevant) · selected (where relevant).

| Component | Notes |
|---|---|
| **Button** | Variants: `primary` (accent fill), `secondary` (surface + border), `ghost`, `danger`. Sizes: sm 32px, md 40px, lg 48px. Loading state keeps width and shows a spinner; press scales to 0.98 |
| **IconButton** | Same variants; square; always has `aria-label` + tooltip |
| **Input / Textarea** | `--surface-2` background, `--border-strong` border; focus = 2px focus ring; error = `--danger` border + message below with icon |
| **CodeEditor** | CodeMirror 6 themed with tokens; line numbers; error line highlighting; mono font |
| **Select, Combobox** | Radix-based; keyboard navigation; popover with `--shadow-2` |
| **Slider** | Shows current value in mono; keyboard step + page-step |
| **Switch, Checkbox, Radio, SegmentedControl** | Segmented control has a sliding indicator (Motion `layoutId`) |
| **Tabs** | Sliding underline indicator |
| **Dialog / Sheet** | Focus trap; Esc closes; backdrop `--overlay`; sheet on mobile |
| **Popover, Tooltip, DropdownMenu** | Tooltip delay 400ms open / 0ms close. Exception: a dialog's close button has no tooltip, because Esc would first dismiss the tooltip instead of the dialog |
| **Toast** | Bottom-centre on mobile, bottom-right on desktop; `aria-live="polite"`; auto-dismiss 4s except errors |
| **CommandPalette** | ⌘K / Ctrl+K; fuzzy search; groups (Tools, Recent, Actions); keyboard hints in mono |
| **DropZone** | Idle, drag-over (accent border + soft fill + gentle scale 1.01), invalid type (danger), processing; also a normal "Choose files" button for keyboard and screen-reader users |
| **FileList** | Name, size, type, thumbnail, remove; reorderable via drag **and** keyboard (move up/down buttons) |
| **ProgressBar** | Determinate when progress is measurable; indeterminate otherwise; announces completion |
| **ResultPanel** | Result summary (e.g. "1.2 MB → 340 KB, −72%"), primary action (Download/Copy), secondary actions (Reset, Use in another tool) |
| **CopyButton** | Icon morphs to a check for 1.5s; announces "Copied" |
| **PrivacyMeter** | "0 bytes uploaded" readout, mono numerals, small status dot; links to the privacy explanation |
| **ComparisonSlider** | Before/after with draggable divider; keyboard arrows move it; shows sizes |
| **PageThumbnailGrid** | Virtualized PDF page grid; drag-reorder; rotate/delete on hover and via keyboard |
| **Breadcrumbs, Badge, Kbd, Skeleton, EmptyState, ErrorState** | Standard; EmptyState always tells the user the next step |

---

## 9. Accessibility rules (design level)

- **Contrast:** body text ≥ 4.5:1; large text (≥ 24px, or ≥ 18.66px bold) and UI component boundaries ≥ 3:1. Verify both themes.
- **Focus ring:** 2px `--focus-ring` with 2px offset, visible on every interactive element; never removed.
- **Target size:** minimum 24×24 CSS px (WCAG 2.2 AA); aim for 40–44px on touch.
- **Drag and drop always has a non-drag alternative** (buttons or keyboard).
- Information is never conveyed by color alone.
- Text can be resized to 200% without loss of content or function.

---

## 10. Layout patterns

### 10.1 Homepage
1. **Instrument hero:** short headline + subline, the large command/search field, and the drop zone combined in one surface. Paste or drop triggers suggestions inline (G-2, G-3).
2. **Privacy proof strip:** one line plus the PrivacyMeter and "How to verify" link.
3. **The index:** three category columns, typeset like a table of contents (tool name, one-line description, keyboard-navigable).
4. **Popular tools:** a small, curated row with live mini-previews where meaningful (e.g. compression before/after).
5. **Short, useful FAQ** and footer.

### 10.2 Tool page (default template)
```
Breadcrumbs
H1 + one-sentence value line                      [PrivacyMeter]
┌──────────────────────── Tool workspace ────────────────────────┐
│ Input (DropZone / editor)  │  Options  │  Result (ResultPanel) │
└────────────────────────────────────────────────────────────────┘
How to use · Supported formats & limits · Explanation · Troubleshooting · FAQ
Related tools
```
The workspace is **above the fold** on desktop and starts within the first screen on mobile.

### 10.3 Workbench (developer tools)
Two panes (input | output) side by side on ≥ `lg`, stacked on smaller screens. Toolbar on top: mode switch (e.g. Encode/Decode as SegmentedControl), options, and actions (Copy, Download, Swap, Clear). Output updates live as the user types (debounced 150ms; heavy work in a worker).

### 10.4 File workspace (PDF tools)
Left: PageThumbnailGrid or FileList. Right (or bottom on mobile): options and the primary action. Result replaces the action area with ResultPanel.

### 10.5 Comparison (image tools)
ComparisonSlider centre stage; options in a side panel; batch list below when multiple images are loaded.

*Phase 6:* the slider is never taller than `--comparison-max-height` (70dvh), so portrait photos fit on screen. Transparent areas (slider, image thumbnails) show the `bg-checker` utility, a checkerboard made from `--surface` and `--surface-3`. remove-exif-data has no visual change to compare, so its centre stage is the metadata inspect panel instead.

---

## 11. Theme switching

- Modes: Light, Dark, System (default). Stored in `localStorage` under `ts:v1:theme`; an inline script (`themeInitScript` in `src/lib/theme.ts`) applies the class before first paint to prevent a flash.
- `.light` / `.dark` can also be set on any element to render a subtree in that theme (used by the component gallery). Do not use Tailwind's `dark:` variant in components; tokens already switch.
- Tokens are CSS variables; `.dark` on `<html>` swaps them.
- Transition: View Transition cross-fade (≤ 380ms) where supported; otherwise instant. Disabled under reduced motion.

---

## 12. Implementation notes (Tailwind 4)

Tokens are defined as CSS variables and exposed to Tailwind with `@theme inline`, so utilities like `bg-surface` and `text-fg-muted` resolve to the tokens. The Tailwind defaults for colors, type sizes, radii, shadows, easings, containers and animations are reset (`--color-*: initial`, …), so only token utilities exist. Shadows are plain utilities (`shadow-1..3`) because they change per theme.

**Enforcement** (Phase 2 exit criterion "no hard-coded design values"): the ESLint rule `sprigkit/no-hardcoded-design` (`scripts/eslint/no-hardcoded-design.mjs`) fails on arbitrary values with literal colors/lengths/times (`w-[37px]`, `bg-[#fff]`), numeric `duration-*`/`delay-*`, Tailwind palette colors, and literal colors or lengths in `style` objects. Token references (`max-h-(--sheet-max-height)`) are allowed.

The snippet below shows the shape; `src/styles/globals.css` is the source of truth.

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --bg: oklch(0.985 0.004 85);
  --surface: oklch(1 0 0);
  --fg: oklch(0.22 0.012 70);
  --accent: oklch(0.64 0.19 42);
  /* …all tokens from §2, §5, §7 */
}
.dark {
  --bg: oklch(0.165 0.005 70);
  --surface: oklch(0.205 0.006 70);
  --fg: oklch(0.955 0.005 85);
  --accent: oklch(0.72 0.17 48);
  /* … */
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-fg: var(--fg);
  --color-accent: var(--accent);
  --radius-md: 10px;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  /* … */
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

---

## 13. Do and don't

| Do | Don't |
|---|---|
| Put the tool above the fold | Open with a marketing hero before the tool |
| Use borders and whitespace to separate | Stack shadows, gradients, and glass effects |
| Use one accent for the one primary action | Color every button and icon |
| Give each tool the layout its job needs | Force every tool into identical cards |
| Show real progress and real numbers | Fake loaders or vague "Processing…" with no end |
| Write errors that say what happened and what to do | "Something went wrong" |
| Animate to explain change | Animate to decorate |
