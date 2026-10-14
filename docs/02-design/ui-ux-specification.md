# UI/UX Specification

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: tool page, Workbench, file workspace built) |
| **Related** | [design-system.md §10](design-system.md#10-layout-patterns) · [information-architecture.md](information-architecture.md) · [tool-specifications.md](../04-architecture/tool-specifications.md) · [motion-design.md](motion-design.md) |

Screen-level layouts. Component behaviour and tokens are in [design-system.md](design-system.md); tool behaviour is in [tool-specifications.md](../04-architecture/tool-specifications.md). Sections marked **Planned** are specified now and built in the phase noted.

## 1. Site shell (built, Phase 2)

```
┌ header (sticky, 64px, --bg, bottom border) ───────────────────────────────┐
│ [mark] Sprigkit   PDF  Image  Developer         [⌕ Search tools…  Ctrl K] [◐] │
└───────────────────────────────────────────────────────────────────────────┘
  <main id="main">  page content (template.tsx: page transition)
┌ footer (top border) ──────────────────────────────────────────────────────┐
│ [mark] Sprigkit                          TOOLS            SPRIGKIT         │
│ Private tools that run in your browser…  PDF tools        About            │
│                                          Image tools      Privacy …        │
│ © 2026 Sprigkit                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Below `md`:** category links and the search field collapse into icon buttons: search, theme, menu. The menu opens a right-side sheet with the navigation.
- **Skip link** appears top-left on first Tab.
- **Theme menu:** icon shows the current preference (sun / moon / monitor); menu offers Light, Dark, System.
- **Search trigger** opens the command palette (also ⌘K / Ctrl+K anywhere). The palette chunk is fetched on hover/focus of the trigger and on first open.
- Footer stacks to one column on mobile, two on `sm`, four on `lg`.
- Pages use `Container` (`content` 720 / `tool` 1200 / `wide` 1360) and `Section` (vertical rhythm).

## 2. Command palette (component built, Phase 2; search in Phase 7)

Near the top of the viewport on `sm`+ (top 96px, 640px wide); a bottom sheet on mobile. Search input (16px), grouped results with mono keyboard hints in a footer (↑↓ move, ↵ select, Esc close). Empty state suggests example queries. Tools are placeholders marked "Soon" and disabled until the registry exists.

## 3. Homepage (Planned, Phase 7)

Per design-system §10.1:
1. **Instrument hero** above the fold: headline (`text-display`), one-line subline, a large command field combined with the drop zone (`--radius-xl`, optional static dot grid ≤ 4% contrast). Paste/drop suggests matching tools inline.
2. **Privacy strip:** one sentence + PrivacyMeter ("0 bytes uploaded") + "How to verify" link to `/privacy`.
3. **Index:** three columns (PDF, Image, Developer), typeset like a table of contents: tool name + one-line description per row, keyboard navigable. Stacks on mobile.
4. **Popular tools:** small curated row; live mini-previews only where meaningful.
5. Short FAQ, footer.

## 4. Tool page (built, Phase 3)

Per design-system §10.2:

```
Breadcrumbs
H1 (text-h1) + one-sentence value line                       [PrivacyMeter]
┌──────────────────── workspace (container-tool, panel --radius-lg) ────────────────────┐
│ Input (DropZone / editor) │ Options │ Result (ResultPanel)                               │
└───────────────────────────────────────────────────────────────────────────────────────┘
How to use · Formats & limits · Explanation · Troubleshooting · FAQ   (container-content)
Related tools
```

- The workspace is above the fold on desktop and starts in the first screen on mobile.
- The static shell renders labels, empty state and accepted formats at build time; the interactive UI hydrates into the same box without layout shift (architecture §7).
- As built: content sections, a shared "How your data stays private" section (the PrivacyMeter links to it), FAQ, then related tools (only live ones).
- States: **empty** (EmptyState with next step) → **working** (real ProgressBar; Cancel) → **result** (ResultPanel: summary like "1.2 MB → 340 KB, −72%", primary Download/Copy, Reset, "Use in another tool") → **error** (ErrorState: what happened + what to do; input kept).

## 5. Workbench, developer tools (built, Phase 3)

Per design-system §10.3: toolbar on top (SegmentedControl for mode, options, actions Copy / Download / Swap / Clear); input | output panes side by side on `lg`, stacked below. Output updates live (150ms debounce; heavy work in a worker). Errors are shown inline at the position (line/column) and in an ErrorState under the editor.

## 6. File workspace, PDF tools (built for merge-pdf, Phase 3)

As built: the empty state is a large DropZone. With files, the list (2/3 width on `lg`) has a compact "Add more PDFs" drop zone under it; the right column holds the file name, a numbers strip (files, pages, size) and the primary action, which is replaced by progress + Cancel while working and by the ResultPanel when done. Rejected files stay in the list with their reason. Everything stacks on mobile.

Per design-system §10.4: left PageThumbnailGrid or FileList (drag **and** move-up/down buttons); right (bottom on mobile) options and the primary action; the result replaces the action area with ResultPanel.

## 7. Comparison, image tools (Planned, Phase 6)

Per design-system §10.5: ComparisonSlider centre stage (arrow keys move the divider; sizes shown), options in a side panel, batch list below when several images are loaded.

## 8. 404 (built, Phase 2)

H1 "Page not found", one sentence explaining the page doesn't exist or isn't built yet, primary button "Go to the homepage".

## 9. Component gallery (built, Phase 2)

`/_gallery`: every component and state, each section rendered in a light and a dark panel side by side (stacked below `xl`). Not linked, `noindex, nofollow`. Used for design review (P2-T18) and the axe check (P2-T20).
