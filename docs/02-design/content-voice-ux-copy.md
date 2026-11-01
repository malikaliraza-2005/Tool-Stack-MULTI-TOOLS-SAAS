# Content Voice & UX Copy

| | |
|---|---|
| **Last updated** | 2026-10-13 (Phase 2) |
| **Related** | [brand-identity.md](brand-identity.md) · [design-system.md §13](design-system.md#13-do-and-dont) · [tool-specifications.md §2.4](../04-architecture/tool-specifications.md) (error codes) |

Sprigkit's words follow the same direction as its design: **calm, exact, honest.** Phase 8 extends this guide for long-form content (guides, FAQs, legal pages).

## 1. Voice

| We are | So we write | We avoid |
|---|---|---|
| Precise | Real numbers and names: "3 files · 4.2 MB", "Page 12 doesn't exist (the PDF has 10 pages)" | "Some files", "invalid input" |
| Calm | Short, plain sentences. No exclamation marks | "Oops!", "Awesome!", hype |
| Honest | Say what happens to data, what a tool can't do, and real progress | "Military-grade", "100% secure", fake progress text |
| Helpful | Every problem comes with the next step | Dead ends, blame |

Second person ("your files"), active voice, present tense. British or American spelling: **American** (matches search phrasing such as "optimize", "color").

## 2. Mechanics

- **Sentence case** everywhere: headings, buttons, menu items, labels ("Download merged PDF", not "Download Merged PDF"). Product and tool names keep their casing ("JSON Formatter", "Sprigkit").
- **Buttons** start with a verb and name the object: "Choose files", "Remove files", "Copy token". The primary action of a tool names its result: "Download merged PDF".
- **Numbers:** numerals always; units with a space ("4.2 MB", "380 ms"); `tabular-nums` for changing numbers; "→" for before/after ("1.2 MB → 340 KB").
- **Keyboard keys:** shown in `Kbd`; written as "Ctrl+K" in prose and "⌘K" for Apple. Write "Ctrl+C (⌘C)" when both matter.
- Typographic quotes and apostrophes (’ “ ”) in UI text; ellipsis character (…) for actions that open more input ("Search tools…").
- No "please", no "simply/just/easy" (it is not easy for everyone).

## 3. Patterns

### Errors (ErrorState, field errors, error toasts)

**What happened + why (if known) + what to do.** Two short sentences at most.

| Instead of | Write |
|---|---|
| "Invalid file." | "This file isn’t a PDF. photo.heic looks like an image. Choose a PDF file, or use JPG to PDF to convert images." |
| "Error parsing JSON." | "Unexpected token at line 2, column 5. Check for a missing comma." |
| "Copy failed." | "Couldn’t copy to the clipboard. Your browser blocked clipboard access. Select the text and press Ctrl+C (⌘C)." |
| "Something went wrong." | Never used. Map every failure to a ToolError code with a specific message. |

Errors stay visible until the user acts (error toasts do not auto-dismiss).

### Empty states

Name the empty thing and the next step: "No files yet. Drop PDFs here, or choose files from your device." with a primary "Choose files" button.

### Success

State the result with numbers; no celebration: "Merged 3 PDFs · merged.pdf · 4.2 MB".

### Privacy

Be literal and verifiable: "Your files never leave your device." "0 bytes uploaded." Link to how to verify it. Never claim more than the CSP and architecture guarantee (analytics, if enabled, is disclosed on /privacy).

### Placeholders and helper text

Placeholders show an example of the expected format ("merged.pdf", `{ "paste": "JSON here" }`), never the label or an instruction. Instructions go in the field description.

### Not built yet

"Soon" badge; 404 says the page "doesn’t exist or hasn’t been built yet". Don't promise dates.

## 4. Microcopy reference (Phase 2 shell)

| Place | Copy |
|---|---|
| Skip link | Skip to content |
| Search trigger | Search tools… · Ctrl K |
| Palette input | Search tools and actions… |
| Palette empty | Nothing matches “x”. Try “PDF”, “compress”, “HEIC” or “JSON”. |
| Homepage headline (Phase 7) | Private tools for PDFs, images and code |
| Homepage subline | Drop a file or paste text, and Sprigkit opens the right tool. Everything runs in your browser. Nothing is uploaded. |
| Homepage search | Search 19 tools, or paste text… |
| Drop hint | Or drop files anywhere on this page · Drop to see which tools can open your files (while dragging) |
| Drop suggestions | Open contract.pdf in · Open 3 files in · No tool here converts this type of file. You can still check its hash or encode it. |
| Paste choice | Open the pasted text in · Looks like JSON |
| Favorite toast | JSON Formatter added to favorites · Favorites are listed first in search (Ctrl K or ⌘K). |
| Update toast | A new version of Sprigkit is available · Refresh to update. Finish what you’re doing first: refreshing clears the page. · Refresh |
| Install action (palette) | Install Sprigkit as an app |
| Palette footer | ↑ ↓ to move · ↵ to select · Esc to close |
| Theme menu | Theme: Light / Dark / System |
| Mobile menu | Menu · Tools · Sprigkit |
| Footer tagline | Private tools that run in your browser. Your files never leave your device. |
| 404 | Page not found · This page doesn’t exist or hasn’t been built yet. Check the address, or start from the homepage. · Go to the homepage |
| Copy button | Copy → Copied (announced) |
| Dialog close | Close |
| Combobox empty | No matches. Try a shorter search. |
