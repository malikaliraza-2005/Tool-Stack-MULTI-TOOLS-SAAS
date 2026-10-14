# Accessibility

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: tool components) |
| **Target** | WCAG 2.2 Level AA on every page and state **[Decision]** |
| **Related** | [design-system.md §9](design-system.md#9-accessibility-rules-design-level) · [testing-strategy.md](../05-quality/testing-strategy.md) · [motion-design.md](motion-design.md) |

## 1. Requirements

| Area | Requirement | Implemented by |
|---|---|---|
| Contrast | Text 4.5:1, large text and UI boundaries 3:1, both themes | Token values; `src/styles/tokens.test.ts` checks every pair (design-system §2.3) |
| Keyboard | Everything operable by keyboard; no traps except modal dialogs; logical tab order | Native elements and Radix primitives; E2E keyboard tests |
| Focus visible | 2px `--focus-ring` with 2px offset on every focusable element, never removed | Global `:focus-visible` rule in `globals.css` |
| Skip link | First focusable element, jumps to `<main id="main">` | Root layout |
| Landmarks | One `banner`, `main`, `contentinfo`; navigation regions labelled ("Categories", "Mobile", "Breadcrumb") | Root layout, Header, Footer |
| Names | Every control has an accessible name; icon-only buttons have `aria-label` + tooltip | `IconButton` requires `label`; `Field` wires labels, descriptions and errors |
| Errors | Error text is linked with `aria-describedby`, the control gets `aria-invalid`, and the message has an icon (never color alone) | `Field`, `ErrorState` (`role="alert"`) |
| Status messages | Announced without moving focus: toasts (`aria-live="polite"` via sonner), "Copied", progress completion (`role="status"`) | `Toaster`, `CopyButton`, `ProgressBar` |
| Dialogs | Focus moves in, is trapped, Esc closes, focus returns to the trigger | Radix Dialog; command palette restores focus to the element focused before it opened |
| Target size | ≥ 24×24px (WCAG 2.5.8); controls 32–48px; mobile menu links ≥ 44px | Component sizes |
| Motion | `prefers-reduced-motion` respected everywhere | [motion-design.md §4](motion-design.md#4-reduced-motion) |
| Reflow / zoom | No horizontal page scroll at 320px or at 200% zoom on a 1280px window | Mobile-first layout; checked in Phase 2 (see §3) |
| Language | `<html lang="en">` | Root layout |
| Theme | Works in light, dark and forced theme subtrees; `color-scheme` set per theme so native controls match | `globals.css` |

### Patterns

- **Slider:** arrow keys step, Page Up/Down step ×10, Home/End; value exposed as `aria-valuetext`.
- **SegmentedControl:** radio group semantics; arrows move and select.
- **Tabs:** arrows move between tabs (automatic activation).
- **Combobox:** button with `role="combobox"` opening a searchable listbox (cmdk).
- **Disabled controls** use 50% opacity (exempt from contrast) and are not focusable, so they have no tooltip.
- **Dialog close button** has an accessible name but no tooltip (its tooltip would swallow the first Esc).
- **Loading buttons** keep their text in the accessibility tree (`aria-busy`), only visually hidden behind the spinner.

### Tool components (Phase 3)

- **DropZone:** a real "Choose files" button; drag and drop and Ctrl+V paste are extras. Drag-over states pair color with a changed title ("Only PDF files can be added here").
- **FileList:** reorder with Move up / Move down buttons named per file; moves and removals are announced (`role="status"`); focus stays on the moved file's controls, moves to the next file after a removal, and to "Choose files" when the list empties.
- **Per-file errors** are shown under the file (icon + text) and announced (`role="alert"`).
- **ResultPanel** moves focus to its heading, because the button that started the work is gone.
- **ProcessingState:** progress bar with an accessible name; Cancel is focused when the work replaced the focused control.
- **CodeEditor:** labelled text area; Tab is not captured, so keyboard users can always leave the editor; errors are linked with `aria-describedby`, highlighted on the line and written out.
- **JSON tree:** `role="tree"` with one tab stop and `aria-activedescendant`; arrow keys, Home/End, Enter/Space (tool-specifications §5.1).
- Syntax colors are checked for contrast on the active-line, selection and error-line backgrounds (`tokens.test.ts`).

Phase 3 results: axe 0 violations on both pilots in the empty, working, error and result states, both themes, in Chromium, Firefox, WebKit and the mobile viewport. **Not done:** screen-reader spot check; 320 px and 200% zoom check on the tool pages.

## 2. Test procedure

### Automated (every CI run)

- `expectNoA11yViolations(page)` (axe-core, WCAG 2.0/2.1/2.2 A + AA tags) on: homepage and 404 in both themes, the component gallery in both page themes (each section renders light and dark side by side), the open command palette, an open dialog, the mobile menu sheet.
- Keyboard E2E: skip link, dialog focus trap and restore, palette Esc and restore, segmented control and tabs arrows.
- Contrast unit tests for all token pairs.

### Manual (before each phase exits)

1. Keyboard only: Tab through the page; every control reachable, focus always visible, no unexpected order.
2. Screen reader spot check: NVDA + Firefox (Windows) and VoiceOver + Safari (iOS/macOS) on new components.
3. 200% browser zoom and 320px viewport: no horizontal scrolling, no clipped content.
4. Reduced motion enabled in the OS.
5. Both themes.

## 3. Phase 2 results (2026-10-13)

| Check | Result |
|---|---|
| axe on gallery (light and dark page theme), home, 404, palette, dialog, mobile sheet | 0 violations (Chromium, Firefox, WebKit, mobile) |
| Token contrast | All pairs pass in both themes |
| 320px width (gallery, home, 404) | No page-level horizontal scroll |
| 200% zoom (1280px window) | No horizontal scroll |
| Keyboard tests | Pass |
| Screen reader spot check | **Not done** (owner, P2-T18) |
| Real-device review | Done by the owner on the preview (P2-T18); no defects reported |

Defects found and fixed during Phase 2: loading buttons lost their accessible name (`visibility: hidden` → `opacity: 0`); dialog close-button tooltip required two Esc presses; command palette returned focus to `<body>`; cmdk items were all rendered at 50% opacity (contrast failure) because `data-disabled="false"` matched Tailwind's `data-disabled:` variant.
