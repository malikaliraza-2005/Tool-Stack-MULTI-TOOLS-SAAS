# UI/UX Specification

| | |
|---|---|
| **Last updated** | 2026-11-01 (Phase 7: homepage, hubs, command palette search) |
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

## 2. Command palette (built, Phase 2; search Phase 7)

Near the top of the viewport on `sm`+ (top 96px, 640px wide); a bottom sheet on mobile. Search input (16px), grouped results with mono keyboard hints in a footer (↑↓ move, ↵ select, Esc close).

As built (Phase 7): with an empty query it lists **Favorites** (star), **Recent** (last 5 tools visited), every tool grouped by category (icon, name, category on `sm`+), **Go to** (Home, the three hubs) and **Actions** (theme). Typing searches tools with Fuse.js by name, synonym and accepted file type ("heic" finds Convert Image), up to 8 results, and filters Go to and Actions by text. The tool list loads from `/search-index.json` on first open ("Loading tools…"; if the request fails: "The tool list couldn’t be loaded. Check your connection and try again."). The query is cleared each time the palette opens.

Favorites are set with the star button next to the PrivacyMeter on each tool page (`aria-pressed`; a toast says where favorites appear).

## 3. Homepage (built, Phase 7)

Per design-system §10.1, top to bottom:

```
            [static dot grid behind the hero, fading out]
              Private tools for PDFs, images and code          (text-display, LCP)
     Drop a file or paste text, and Sprigkit opens the right tool. …
   ┌──────────────────────── hero surface (--radius-xl) ────────────────────────┐
   │ ⌕  Search 19 tools, or paste text…                                          │
   │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
   │ [⇪] Or drop files anywhere on this page                  [Choose files]    │
   └─────────────────────────────────────────────────────────────────────────────┘
   ┌ suggestions (after a drop or an ambiguous paste) ──────────────────── [×] ┐
   │ Open contract.pdf in              PDF document · 1.2 MB                     │
   │ [Merge PDF →] [Split PDF →] [Organize PDF →] …   (2 columns on sm+)        │
   └─────────────────────────────────────────────────────────────────────────────┘
Privacy strip · All tools (3 columns) · Popular tools (4 cards) · FAQ · footer
```

1. **Instrument hero.** One surface, 720px wide:
   - **Search** (combobox): Fuse.js loads on focus; up to 6 results in a listbox under the field; ↑↓ move, ↵ opens, Esc clears. No match: "No tools match “x”. Try …".
   - **Drop** files anywhere on the page, choose them with the "Choose files" label (native picker, works before hydration), or paste files. While dragging, the surface turns accent (border, soft fill, scale 1.01) and says "Drop to see which tools can open your files". Files are sniffed by magic bytes; the suggestion panel names the file and size and lists the tools that fit, most common job first. Several files: only multi-file tools. No fitting tool: Hash Generator and Base64 with "No tool here converts this type of file. You can still check its hash or encode it." Mixed files no tool takes together: "No tool takes these files together" + what to do.
   - **Smart paste** into the field, or anywhere on the page outside another field: a clear detector match opens the tool with the text filled in ("Opening JWT Decoder…" is announced); a close call shows "Open the pasted text in" with one row per tool ("Looks like JSON"); anything else is pasted as a search query.
   - Choosing a tool hands the files or text over in memory and navigates. Focus moves to the suggestions heading when they appear; × clears them and returns focus to the field.
2. **Privacy strip:** "Your files never leave your device." + one sentence on the CSP, PrivacyMeter and "How to verify" (both to `/privacy`, built in Phase 8).
3. **The index:** "All tools", three columns (one on mobile). Each column: an overline with the category name and a mono count over a 1px `--fg` rule, then numbered rows (mono `01`, tool name, first sentence of the tagline) separated by hairlines; each row is one link, in reading order for Tab. "All PDF tools →" leads to the hub.
4. **Popular tools:** Merge PDF, Compress Image, Convert Image, JSON Formatter, each with a small token-drawn preview of what it does (pages into one PDF, a quality slider, HEIC → JPG, a formatted JSON line). Previews are illustrations, so they show no invented results.
5. **FAQ** (4 questions, visible) and the footer.

**Entrance (P7-T08):** the subline, hero surface, privacy strip and index rise 8px and fade in (`animate-rise-in`, `--dur-standard`), 40ms apart (`stagger`). The headline isn't animated (it is the LCP element). It is CSS only, so input works from the first frame. With reduced motion there is no delay and no movement.

## 3a. Category hubs (built, Phase 7)

`/pdf-tools`, `/image-tools`, `/developer-tools`: breadcrumbs (Sprigkit › PDF tools), H1 and intro with the PrivacyMeter, "6 PDF tools" as cards (icon, name, full tagline; 3 columns on `lg`), then **Guides** (4 links to tools' "How to use" sections) and **More tools** (the other hubs) side by side on `lg`.

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
