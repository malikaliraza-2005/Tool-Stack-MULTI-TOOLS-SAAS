# Tool Specifications

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: clarifications from the pilots) |
| **Related** | [mvp-scope.md](../01-product/mvp-scope.md) · [tool-registry.md](tool-registry.md) · [architecture.md](architecture.md) · [dependencies-licenses.md](dependencies-licenses.md) |

This document defines how every MVP tool behaves. **Acceptance tests listed here are the minimum unit/E2E tests to write.** Limits refer to the registry (`limits`), with starting values from [mvp-scope.md](../01-product/mvp-scope.md) §4.

---

## 1. Contents

**Shared:** [2. Shared behaviour](#2-shared-behaviour)
**PDF:** [merge-pdf](#31-merge-pdf) · [split-pdf](#32-split-pdf) · [organize-pdf](#33-organize-pdf) · [jpg-to-pdf](#34-jpg-to-pdf) · [pdf-to-jpg](#35-pdf-to-jpg) · [sign-pdf](#36-sign-pdf)
**Image:** [compress-image](#41-compress-image) · [convert-image](#42-convert-image) · [resize-image](#43-resize-image) · [remove-exif-data](#44-remove-exif-data)
**Developer:** [json-formatter](#51-json-formatter) · [jwt-decoder](#52-jwt-decoder) · [base64-encode-decode](#53-base64-encode-decode) · [url-encode-decode](#54-url-encode-decode) · [diff-checker](#55-diff-checker) · [regex-tester](#56-regex-tester) · [unix-timestamp-converter](#57-unix-timestamp-converter) · [uuid-generator](#58-uuid-generator) · [hash-generator](#59-hash-generator)

---

## 2. Shared behaviour

### 2.1 File input (all file tools)
- Input methods: drag-and-drop onto the DropZone, "Choose files" button (keyboard accessible), paste from clipboard (images), hand-off from homepage or another tool.
- **Type detection by magic bytes**, extension as a hint only:
  PDF `%PDF-` · JPEG `FF D8 FF` · PNG `89 50 4E 47` · WebP `RIFF....WEBP` · GIF `GIF8` · AVIF/HEIC `ftyp` box with brand (`avif`, `avis`, `heic`, `heix`, `mif1`) · BMP `BM`.
- Limits checked **before** reading file contents: over soft limit → warning but allowed; over hard limit → rejected with `E_TOO_LARGE`.
- Mixed valid/invalid files: valid ones are accepted; each rejected file shows its own reason.
- The FileList shows name, size, type, thumbnail (images, PDF first page), and remove; reorder by drag and by keyboard (move up/down).
- *Clarified in Phase 3:* the registry says whether limits apply per file or to all files together (`limits.per`; PDF tools: total). Rejected and damaged files **stay in the list** with their reason and are left out of processing; the primary action counts only valid files. Files are checked when added (magic bytes, then a quick load in the worker), so problems show next to the file before the user starts. Files pasted with Ctrl+V (⌘V) are accepted anywhere on a file tool's page. PDF thumbnails are rendered with pdf.js on intent; when a PDF can't be rendered, a generic icon is shown.

### 2.2 Output and download
- Single output: download with a sensible name: `<original>-<action>.<ext>` (e.g. `report-merged.pdf`, `photo-compressed.webp`). Merged outputs default to `merged.pdf`, editable before download.
- Multiple outputs: individual downloads **and** "Download all (ZIP)" via fflate (store mode for already-compressed formats).
- Downloads via `Blob` + object URL; URL revoked after use.
- ResultPanel always shows a numeric summary (size before/after, page count, number of files).
- "Reset" returns to the empty state and releases memory.

### 2.3 Workbench (developer text tools)
- Input editor (CodeMirror) and output panel; live update debounced 150ms; heavy inputs processed in a worker.
- Actions: Copy output, Download output, Clear, Swap (where a reverse mode exists), Load file (where relevant).
- Last-used **options** (not content) persist in `localStorage`.
- Input content is never persisted and never placed in the URL.
- Sample button inserts a realistic example for first-time users.
- *Clarified in Phase 3:* the editor is a plain text area until CodeMirror loads on intent (hover, focus, or content to show); the text, selection and focus carry over. *Phase 4:* focus did not carry over (fixed; covered by an E2E test). `CodeEditor` sets its label and placeholder once, so a tool whose labels change by mode remounts it with `key`. Long single-line content (Base64) uses the `wrap` prop.

### 2.4 Error taxonomy (`src/lib/errors.ts`)

| Code | When | User message pattern |
|---|---|---|
| `E_UNSUPPORTED_FORMAT` | Type not accepted | "This file is a {type}. {Tool} accepts {formats}." |
| `E_TOO_LARGE` | Above hard limit | "{name} is {size}. The limit on this device is {limit}. Try {suggestion}." |
| `E_CORRUPT` | Parsing failed | "{name} couldn't be read. It may be damaged or incomplete." |
| `E_ENCRYPTED` | Password-protected PDF | "{name} is password-protected. Remove the password first, then try again." |
| `E_OUT_OF_MEMORY` | Allocation failure | "Your browser ran out of memory. Try fewer or smaller files, or a desktop browser." |
| `E_TIMEOUT` | Worker exceeded time limit | Tool-specific (e.g. regex) |
| `E_CANCELLED` | User cancelled | No error shown; returns to previous state |
| `E_INVALID_INPUT` | Text input invalid | Precise, located message (line/column where possible) |
| `E_UNKNOWN` | Anything else | "Something unexpected happened while {action}. Nothing was uploaded. Please try again." + details toggle |

Errors are shown inline next to the affected input, announced via `aria-live="assertive"`, and never as alerts.

### 2.5 Progress and cancellation
- Operations expected to take > 300ms show a ProgressBar; determinate when per-page or per-file progress is known.
- A "Cancel" action is available during processing and terminates the worker.

### 2.6 Privacy
- No network requests during processing (verified by E2E test).
- No content in `localStorage`, URLs, analytics, or error reports.

---

## 3. PDF tools

Libraries: **pdf-lib** for creating/modifying, **pdfjs-dist** for rendering thumbnails/pages.

### 3.1 merge-pdf
- **Input:** 2+ PDF files.
- **Options:** order (FileList reorder; default = selection order); output filename (`merged.pdf`).
- **Processing:** for each file `PDFDocument.load(bytes)` → `copyPages(src, src.getPageIndices())` → add to new document → `save()`. Preserve page size and rotation. Document outline/bookmarks and form fields are **not** guaranteed to be preserved (state in content).
- **Output:** one PDF; summary "N files → 1 PDF, X pages, Y MB".
- **Errors:** `E_ENCRYPTED`, `E_CORRUPT`, `E_UNSUPPORTED_FORMAT`, `E_TOO_LARGE`, `E_OUT_OF_MEMORY`. Merge button disabled with hint if fewer than 2 valid files.
- *Clarified in Phase 3:* the output name is sanitized (characters file systems reject become `-`) and `.pdf` is added when missing; an empty name falls back to `merged.pdf`. Any change to the list after merging discards the result. Encryption is detected the way pdf-lib sees it (an `/Encrypt` entry), which also covers owner-password-only files that PDF readers open without asking.
- **Acceptance tests:**
  1. Merging 2 fixtures yields page count = sum, in chosen order.
  2. Reordering changes output order.
  3. Encrypted fixture → `E_ENCRYPTED`; other files remain usable.
  4. Non-PDF renamed `.pdf` → `E_UNSUPPORTED_FORMAT`.
  5. Mixed page sizes (A4 + Letter) are preserved.
  6. No network requests during merge.

### 3.2 split-pdf
- **Input:** 1 PDF.
- **Modes:**
  - **Extract pages** (default): range string → one PDF. Syntax: `1-3, 5, 8-` (open-ended), whitespace tolerant, 1-based.
  - **Split every N pages** → multiple PDFs (ZIP).
  - **Split into single pages** → one PDF per page (ZIP).
- **Processing:** pdf-lib `copyPages` for selected indices.
- **Output:** PDF or ZIP; files named `<name>-pages-1-3.pdf`, `<name>-part-2.pdf`, `<name>-page-7.pdf`.
- **Errors:** invalid range → `E_INVALID_INPUT` with the exact offending token ("'12' is beyond the last page (10)"); plus shared file errors.
- **Acceptance tests:** range parser unit tests (valid, reversed `5-3` → error, duplicates de-duplicated in order, out of bounds, open-ended); each mode's output page counts; ZIP contains expected file names.
- *Clarified in Phase 5:* the parser (`src/lib/pdf/page-range.ts`, shared with pdf-to-jpg) also accepts `-3` (first page to 3) and ignores empty parts (`1,,2`, a trailing comma); two numbers without a dash (`1 2`) are an error. Extracted pages come out in the order typed. The extract file name lists the pages with `_` between parts (`report-pages-1-3_5.pdf`) and falls back to `report-extract.pdf` when the list is longer than 40 characters. Several outputs download as `<name>-split.zip` (PDFs stored, not recompressed) or one by one; the page lists the first 100. Ranges are validated and the file count previewed as the user types (`plan.ts`, no pdf-lib); building the files runs in the worker. `loadPdf` moved to `src/lib/pdf/load.ts` and the generated fixtures to `src/lib/pdf/__fixtures__/pdfs.ts`, shared by all PDF tools.

### 3.3 organize-pdf
- **Input:** 1 PDF.
- **UI:** PageThumbnailGrid (virtualized; thumbnails rendered by pdf.js at low scale in a worker, lazily as they scroll into view).
- **Actions per page:** rotate left/right (90° steps), delete, drag to reorder; multi-select (Shift/Ctrl-click, keyboard) for bulk rotate/delete. Undo/redo (Ctrl+Z / Ctrl+Shift+Z).
- **Processing:** build new document from the edited page list with `setRotation(degrees(existing + delta))`.
- **Output:** one PDF.
- **Errors:** deleting all pages → action prevented with message; shared file errors.
- **Acceptance tests:** rotate/delete/reorder reflected in output; undo/redo restores state; keyboard-only reorder works; 300-page fixture remains responsive (only visible thumbnails rendered).
- *Clarified in Phase 5:* PageThumbnailGrid (`src/components/tool/PageThumbnailGrid.tsx`) is a virtualized listbox: only visible rows are in the DOM; thumbnails are parsed and decoded in pdf.js's worker and painted on the page at 160 px, one at a time and most recent first, lazily as rows scroll into view (`src/lib/pdf/render.ts`), and cached per source page. The 300-page E2E test measured a 183 ms longest frame gap while scrolling to the end and rotating all pages. Actions apply to the selection, or to the focused page when nothing is selected. Keyboard: arrows move focus, Space toggles, Shift+arrows/Home/End select a range, Ctrl/⌘+A selects all, Escape clears, Ctrl/⌘+arrows move the pages, R / Shift+R rotate, Delete deletes, Ctrl/⌘+Z and Ctrl/⌘+Shift+Z (or Ctrl+Y) undo and redo. Mouse: click, Ctrl/⌘-click, Shift-click; drag after 6 px. Touch: drag after a 220 ms press (a swipe still scrolls; Android vibrates briefly on lift). Dragging looks the same on every device: the page lifts off the grid as a tilted card with its page number (a stacked deck with a count for several pages) that follows the pointer, the other pages slide aside to open a "Drop here" slot, the list scrolls near its edges, dropped pages pop into place, and Escape cancels. The toolbar offers the same actions; every change is announced. The page list model (`src/lib/pdf/page-editor.ts`) keeps 100 undo steps. Rotation is added to each page's existing /Rotate. Output: `<name>-organized.pdf`.

### 3.4 jpg-to-pdf
- **Input:** 1+ images (JPG, PNG, WebP, GIF first frame, BMP, HEIC/HEIF per D-6).
- **Options:** page size **Fit to image** (default) / A4 / Letter; orientation Auto (default) / Portrait / Landscape; margin None (default) / Small (12pt) / Large (36pt); order via FileList.
- **Processing:** JPG → `embedJpg`; PNG → `embedPng`; other formats decoded and re-encoded to PNG (lossless) or JPEG (photos, quality 0.92) before embedding. Respect EXIF orientation. One image per page, centred and scaled to fit within margins.
- **Output:** one PDF.
- **Acceptance tests:** page count = image count; EXIF-rotated JPEG appears upright; A4 with margin places image inside bounds; transparent PNG keeps transparency.
- *Clarified in Phase 5:* JPEG and PNG are embedded as they are. EXIF orientation of JPEGs is applied with a PDF transformation matrix (all 8 orientations, unit-tested), so the original JPEG data is kept and nothing is re-encoded. WebP, GIF (first frame), BMP and AVIF are decoded in the worker with `createImageBitmap` (EXIF applied by the browser) and re-encoded with OffscreenCanvas: PNG if any pixel is transparent, else JPEG 0.92; PNGs pdf-lib can't read take the same path. jSquash isn't needed for this tool. **HEIC:** decoded where the browser can (Safari); elsewhere a clear "can't open yet" message, until libheif ships under D-6 with the Phase 6 codecs (P6-T09). Fit to image uses 96 px per inch (0.75 pt per pixel), capped at the 14,400 pt PDF page limit. Fixed page sizes scale the image to fit within the margins (up or down), centred; Auto orientation follows the image. Output: `<image>.pdf` for one image, `images.pdf` for several, renamable. Limits: 25 MB soft / 100 MB hard per image, 100 images (50 on phones). Image fixtures are generated in code (`src/lib/files/__fixtures__/images.ts`).

### 3.5 pdf-to-jpg
- **Input:** 1 PDF.
- **Options:** format **JPG (default, quality 0.9)** / PNG; resolution 72 / **150 (default)** / 300 DPI; pages: all (default) or range (same syntax as split-pdf).
- **Processing:** pdf.js render each page to an OffscreenCanvas in a worker at `DPI / 72` scale → encode → collect. Pages processed sequentially.
- **Limits:** canvas area capped per device; known small limit on iOS Safari (≈16.7 megapixels **[verify]**). If a page exceeds it, reduce the scale and tell the user.
- **Output:** single image or ZIP.
- **Acceptance tests:** output count = selected pages; dimensions match DPI × page size (± 1px); 300 DPI on large page triggers downscale message under mobile limits; JPG has no alpha.
- *Clarified in Phase 5:* **Deviation:** pages are painted on the main thread, one at a time, like the Organize PDF thumbnails; pdf.js parses the file in its own worker (`openPdfRenderer` in `src/lib/pdf/render.ts`). Cancel stops between pages. pdf.js validates the file too, so no pdf-lib load: `PasswordException`, or a failure on a file that declares `/Encrypt`, is reported as password-protected; other failures as damaged. Pages are drawn on white. Canvas cap: 16,777,216 px on phones and tablets (the iOS Safari limit), 100 megapixels on desktop; a larger page keeps its aspect ratio at a lower DPI and the result names it (`plan.ts`, unit-tested). Output: `<name>-page-N.jpg|png`, several as `<name>-images.zip`; the page lists the first 100 for single download.

### 3.6 sign-pdf
- **Input:** 1 PDF.
- **Features:**
  1. **Fill form fields** (AcroForm: text, checkbox, radio, dropdown) when present; fields listed in a side panel and highlighted on the page.
  2. **Add signature:** draw (signature_pad, pressure-smoothed), type (choice of 3 bundled OFL handwriting-style fonts), or upload an image (PNG with transparency recommended).
  3. **Add text, date, and checkmark** annotations.
  4. Place items by drag on the page preview; resize with handles; keyboard nudge with arrow keys (Shift = 10px).
- **Options:** Flatten on save (default **on**: fields and placed items become part of the page content).
- **Processing:** pdf-lib `getForm()` to fill fields; signatures embedded as PNG images; text drawn with an embedded font; flatten if selected.
- **Not supported (state clearly):** cryptographic/certified digital signatures, XFA forms.
- **Disclaimer (visible):** "This adds a visual signature. It is not a certified digital signature. Check whether the recipient accepts electronic signatures."
- **Saved signatures:** not stored by default; optional "Remember my signature on this device" stores the PNG in `localStorage` only after explicit opt-in, with a clear delete control.
- **Acceptance tests:** filled text field values present in output; flattened output has no form fields; signature image placed at the chosen coordinates on the chosen page (within 1pt); XFA fixture shows unsupported message.
- *Clarified in Phase 5:* the worker reads page boxes (crop box + /Rotate), fields and widget positions with pdf-lib; pages are shown with pdf.js, rendered lazily near the viewport and released when far away. Items are kept in view points (top-left origin, as displayed) and mapped to PDF user space on save for all four page rotations, drawn rotated with the page so they appear upright (`geometry.ts`, unit-tested). Fields: text (single and multiline, max length), checkbox, radio, dropdown and list box (single choice); push buttons and signature fields are listed as not fillable. The field being edited is highlighted on the page (which scrolls to it on wide screens) and changed values are previewed over it. Field values use the standard font (Helvetica, WinAnsi): text it can't encode gets an error naming the field. Placed text uses Helvetica too and falls back to a PNG for other scripts. Signatures: Draw (signature_pad, black or blue ink, undo/clear), Type (12 styles, owner request 2026-11-01: Dancing Script, Great Vibes, Allura, Sacramento, Alex Brush, Mr Dafoe, Yellowtail, Herr Von Muellerhoff, Mrs Saint Delafield, Caveat, Homemade Apple, Cedarville Cursive; OFL-1.1 or Apache-2.0, self-hosted, loaded when Type is shown; previewed with the user's name in a grid) or Upload (PNG/JPG/WebP, optional white-to-transparent); all are trimmed PNGs. Checkmarks are a vector path. Placement: drag (pointer capture, also touch), corner handle resizes keeping the aspect ratio, keyboard arrows move 1 pt (Shift 10 pt), + and − resize, Delete removes; new items go to the page in the middle of the screen. XFA: pdf-lib can't read XFA, so the fields aren't offered and a message explains it; placed items still work and the XFA is removed on save, so readers show the regular form and page content. Flatten off keeps fields editable; placed items are always page content. Remembered signature: an opt-in PNG data URL (max 400 K characters) under `ts:v1:sign-pdf:signature`, with Use and Delete in the dialog; nothing else is stored. Output: `<name>-signed.pdf`.

---

## 4. Image tools

Libraries: **@jsquash/*** codecs (jpeg/mozjpeg, png, webp, avif, oxipng, resize); **exifr** to read metadata. All codecs loaded on intent in a worker.

*Phase 6:* the four tools share `src/lib/image` (pipeline, codecs, metadata) and one worker (`image.worker.ts`) run on a pool of 2 (1 on phones). Files are checked from their header when added (type, upright size, alpha, animation), and images above 120 MP (50 MP on phones) are rejected with `E_TOO_LARGE`. Photos are decoded by the browser (colour-managed, EXIF orientation applied) with the WASM decoder as fallback; PNG is decoded with WASM so lossless output keeps exact pixels. Metadata is removed in-house at segment/chunk level; piexifjs is not used.

### 4.1 compress-image
- **Input:** JPG, PNG, WebP, AVIF; multiple.
- **Options:** output format Same as input (default) / JPG / WebP / AVIF / PNG; quality 0–100 (**default 75**; hidden for PNG); PNG mode Lossless (oxipng, default); max dimension (optional resize, off by default); strip metadata (default **on**).
- **Processing:** decode → (optional resize) → encode with chosen codec.
- **Output UX:** ComparisonSlider for the selected image; per-file sizes and percentage saved; batch list with totals.
- **Rule:** if the result is **larger** than the original, keep the original and say so ("Already well optimized, original kept").
- **Acceptance tests:** JPEG at q75 is smaller than a high-quality JPEG fixture; PNG lossless output decodes to identical pixels; larger-result rule; batch of 10 completes with correct totals; metadata stripped when on.
- *Clarified in Phase 6:* max dimension is a "Longest side" choice (keep, 3840, 2560, 1920, 1280, 1024 px; never enlarges). Keeping metadata works only when a JPG stays a JPG (EXIF/XMP/IPTC copied, orientation reset to 1); other outputs never carry metadata. When the original is kept, its metadata is still removed (losslessly) unless "Remove metadata" is off. The slider hides when every output is PNG. AVIF is labelled "smallest, slower". Output: `<original>-compressed.<ext>`.

### 4.2 convert-image
- **Input:** JPG, PNG, WebP, AVIF, GIF (first frame), BMP, HEIC/HEIF (decoded with `libheif-js` under the D-6 conditions).
- **Options:** output format JPG (default when input has no alpha) / PNG (default when input has alpha) / WebP / AVIF; quality (lossy formats, default 85); background color for transparency → JPG (default white).
- **Processing:** decode → (flatten alpha onto background if target lacks alpha) → encode. Apply EXIF orientation so output is upright.
- **Acceptance tests:** each format pair round-trips; alpha to JPG uses background color; animated GIF warns "first frame only"; HEIC fixture converts correctly; if the HEIC decoder fails to load, a clear "HEIC could not be opened" message is shown (D-6 fallback: "not supported yet").
- *Clarified in Phase 6:* the default is "Auto": JPG, or PNG when the decoded image actually has transparent pixels (decided per image in the worker). Background choices: white (default), black or a custom colour, shown only when JPG output can meet a transparent input. HEIC: the browser decoder first (Safari), libheif otherwise (D-6). GIF (first frame) and BMP have small JavaScript decoders as a fallback for browsers whose workers lack OffscreenCanvas. Output keeps the original name with the new extension (`IMG_1234.jpg`), or `-converted` when the format doesn't change.

### 4.3 resize-image
- **Input:** JPG, PNG, WebP, AVIF; multiple.
- **Modes:**
  - **Resize:** by pixels (width/height, aspect lock default on) or by percentage; presets (e.g. 1920 wide, 1080 square, common social sizes, labelled generically).
  - **Crop:** free or fixed aspect (1:1, 4:3, 16:9, 3:2, 9:16); drag handles; keyboard adjustable.
- **Options:** resampling Lanczos (default) via @jsquash/resize; output format Same as input (default); quality 85 for lossy; "Don't enlarge" (default on).
- **Acceptance tests:** exact output dimensions; aspect lock math (rounding to nearest px); "don't enlarge" respected; crop coordinates correct; EXIF orientation applied before crop.
- *Clarified in Phase 6:* width and height may each be left empty. With proportions kept and both set, "Fit inside" keeps the whole image within the box and "Fill and crop" fills it exactly with a centred crop; presets with both sides use Fill and crop. With one image, typing one side fills in the other. Presets: 3840/1920/1280 wide, 1080 × 1080, 1080 × 1350, 1080 × 1920, 1200 × 630, 1500 × 500. Percentage 1–400%. Crop: each image has its own crop area (select it in the list); keyboard: arrows move, Shift + arrows resize, Alt for 10% steps. Output: `<original>-resized|-cropped.<ext>`.

### 4.4 remove-exif-data
- **Input:** JPG, PNG, WebP (HEIC not supported in MVP); multiple.
- **Step 1, Inspect:** read with exifr and show what was found, grouped: **Location (GPS)** highlighted first, Camera & device, Date & time, Software, Other. GPS shown as text coordinates **only** (no map: map tiles would require external requests).
- **Step 2, Remove:**
  - **JPEG:** lossless removal of EXIF/XMP/IPTC segments, done in-house at segment level. *Phase 6:* also removes comments (COM), JFXX thumbnails, other camera APP segments and data after the end of the image; JFIF, the ICC colour profile and the Adobe segment are kept (they only describe how to show the pixels). **Orientation** kept by default so the photo doesn't appear rotated; option "Remove everything" bakes the rotation into pixels (re-encode at quality 95) and removes the tag.
  - **PNG:** remove `eXIf`, `tEXt`, `iTXt`, `zTXt` chunks (*Phase 6:* and `tIME`); pixels untouched.
  - **WebP:** remove `EXIF` and `XMP ` chunks from the RIFF container; update chunk sizes.
- **Output:** cleaned files; summary per file ("Removed: GPS location, camera model, date taken").
- *Clarified in Phase 6:* exifr can't read WebP, so the inspect view reads the WebP EXIF chunk's TIFF data directly (XMP is listed as present). When one metadata block is damaged, exifr returns nothing, so reading is retried without IPTC, then without XMP. Output names: `<original>-no-metadata.<original ext>`.
- **Acceptance tests:** GPS fixture → output has no GPS (verified by re-reading with exifr); JPEG pixel data unchanged in default mode (byte-compare scan data); orientation preserved by default; PNG text chunks removed; WebP container still valid.

---

## 5. Developer tools

All use the Workbench (§2.3) unless stated.

### 5.1 json-formatter
- **Input:** text or `.json` file.
- **Modes:** Format (default) / Minify / Tree view.
- **Options:** indent 2 spaces (default) / 4 / tab; sort keys (off); allow comments & trailing commas (JSONC, off).
- **Validation:** parse with `jsonc-parser` to get exact error offsets → show "Line L, column C: {message}" and highlight the line. Strict mode reports comments/trailing commas as errors.
- **Extras:** warn when numbers exceed `Number.MAX_SAFE_INTEGER` (precision loss in JavaScript); tree view virtualized with expand/collapse all and copy path (e.g. `$.users[3].email`).
- **Worker:** inputs > 1 MB.
- *Clarified in Phase 3:*
  - Output is rebuilt from the syntax tree, but every number and string literal is copied from the input as written, so big integers and escapes never change. Output is always strict JSON: in JSONC mode, comments and trailing commas are removed.
  - Sort keys orders object keys by UTF-16 code unit; duplicate keys keep their order.
  - The reported error is the first one. A missing comma at the end of a line is reported after the value that needs it (not at the next line's value); trailing commas and leading zeros get their own messages. In strict mode the result is cross-checked with `JSON.parse`.
  - Nesting deeper than 2000 levels is rejected with a message (prevents a stack overflow).
  - Minified output over 1 MB is not shown in the editor (one very long line); it can be copied or downloaded.
  - Tree view keyboard: one tab stop; ↑/↓, Home/End move; → expands or enters; ← collapses or goes to the parent; Enter/Space toggles. "Copy path" copies the selected row's path.
  - The big-number warning names the count and the first path; the output keeps every digit.
- **Acceptance tests:** formatting idempotent; minify then format equals format; error location correct for 5 malformed fixtures; big-number warning; 20 MB file formats without freezing the UI.

### 5.2 jwt-decoder
- **Input:** a JWT (whitespace and `Bearer ` prefix trimmed).
- **Decode:** base64url-decode header and payload; pretty JSON; claims table with human-readable `exp`, `iat`, `nbf` (local time + relative, e.g. "expired 3 hours ago"); status badge Valid / Expired / Not yet valid (time-based only).
- **Verify (optional panel):** algorithm from header; secret (HS256/384/512) or public key as PEM/JWK (RS*, PS*, ES*, EdDSA) → verify with `jose`. Result: "Signature verified" / "Invalid signature" / "Key type doesn't match algorithm".
- **Safety:** `alg: none` flagged as insecure; tokens never stored; no share link; a note explains that decoding is not verification.
- **Acceptance tests:** decode fixtures for HS256, RS256, ES256; verification true/false cases; malformed token (2 segments, bad base64url, non-JSON header) → located error; `Bearer ` prefix trimmed; expiry status computed with a mocked clock.
- *Clarified in Phase 4:* decoding needs no library (base64url + JSON); line breaks inside the token are removed and error positions point into the original input. Five-part tokens are recognised as JWE and explained. Verification uses jose `compactVerify` (signature only, `algorithms` pinned to the header's alg), loaded on Verify. HS secrets are text (UTF-8). Keys: SPKI PEM, X.509 certificate, JWK or JWKS (by `kid`); private keys and PKCS#1 RSA keys are refused with an explanation. Status is computed when the token is entered, from the device clock. The relative-time formatter moved to `src/lib/time.ts` (shared with the timestamp converter).

### 5.3 base64-encode-decode
- **Modes:** Encode / Decode (SegmentedControl; Swap moves output to input).
- **Options:** URL-safe alphabet (off); line wrap at 76 chars (off); input charset UTF-8.
- **File mode:** file → Base64 or data URL (`data:<mime>;base64,…`); Base64/data URL → downloadable file, type detected from magic bytes or data-URL MIME.
- **Errors:** invalid characters or length → `E_INVALID_INPUT` with position; decoded bytes that aren't valid UTF-8 → offer "Download as file" instead of showing garbled text.
- **Acceptance tests:** UTF-8 round trip incl. emoji and non-Latin scripts; URL-safe variant; padding handling; binary file round trip byte-identical; data-URL parsing.
- *Clarified in Phase 4:* URL-safe output also drops `=` padding (as in JWTs). Decoding accepts both alphabets, missing padding, and spaces and line breaks anywhere; wrong padding (e.g. `Zg=`) and `=` before the end are errors. Data URLs without `;base64` are percent-decoded. Decoded bytes are shown as text only when they are valid UTF-8, contain no NUL byte and aren't a detected file type (PDF, JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP, ZIP, gzip); otherwise the output is a download named `decoded.<ext>`. In Encode, Open file encodes the file (worker); in Decode, it opens Base64 saved as text. Data URL output (files only) always uses the standard alphabet on one line, so URL-safe and Wrap are disabled with it.

### 5.4 url-encode-decode
- **Modes:** Encode / Decode / **Parse**.
- **Encode options:** Component (`encodeURIComponent`, default) vs Full URL (`encodeURI`); space as `%20` (default) or `+` (form encoding).
- **Decode:** `decodeURIComponent` with `+` → space option; malformed `%` sequence → error with position.
- **Parse:** `new URL()` → protocol, username (password masked), host, port, path, query parameters table (decoded key/value, duplicates shown), fragment. Copy any part.
- **Acceptance tests:** reserved characters per mode; round trip; malformed sequence error; parser handles IPv6 hosts, ports, repeated params, and Unicode (IDN shown in both Unicode and punycode).
- *Clarified in Phase 4:* "Space as +" applies to Component only (encodeURI leaves "+" unescaped, so it would be ambiguous). Decoding reports two errors with position: "%" not followed by two hex digits, and escapes that aren't valid UTF-8 (e.g. Latin-1 `%E9`); "+ as space" converts literal "+" only, never `%2B`. Parse shows the default port with a "default" badge when none is given, the decoded path when it differs, and the password masked (Copy copies it). Punycode is decoded by a small built-in function (no dependency). Input limit: 1 MB soft, 10 MB hard (no worker).

### 5.5 diff-checker
- **Input:** original and changed text (paste or load files).
- **Options:** view Side-by-side (default ≥ lg) / Inline; granularity Line (default) / Word / Character; ignore whitespace; ignore case.
- **Processing:** `diff` library in a worker; results virtualized for large inputs.
- **Output:** highlighted additions/removals (soft status colors + `+`/`−` markers, not color alone); counts of added/removed lines; next/previous change navigation (keyboard `n`/`p` or buttons); copy as unified diff.
- **Acceptance tests:** known fixture pairs produce expected hunks; ignore-whitespace/case options; unified diff output parses with `patch`-compatible format; 50k-line inputs stay responsive.
- *Clarified in Phase 4:* lines are diffed as arrays (`diffArrays`) on normalized keys, so Ignore whitespace (runs of whitespace collapsed, ends trimmed) and Ignore case apply to line matching; each side still shows its own text. A last line without a newline differs from the same line with one, as in `diff -u`. Changed line pairs are then diffed by word (`diffWordsWithSpace`) or character (default granularity: Word). The unified diff is generated from the same rows (3 lines of context, ` No newline at end of file`) and is checked with jsdiff's `parsePatch`/`applyPatch`; with ignore options on, context lines come from the original. The diff always runs in the worker, debounced 300 ms, with a 10 s timeout ("too different to compare quickly"). Side by side is offered from `lg`; narrower screens always show the inline view. Results are virtualized (TanStack Virtual); the 50k-line E2E test measured a 317 ms longest frame gap.

### 5.6 regex-tester
- **Input:** pattern, flags (`g i m s u y d v`, toggles), test text.
- **Output:** match highlighting in the text; matches list with index, groups (numbered and named), and positions; optional Replace mode with replacement preview (`$1`, `$<name>`).
- **Explanation (P1):** a plain-language breakdown of common tokens (character classes, quantifiers, groups, anchors, lookarounds) generated in-house; unsupported constructs shown as "not explained".
- **Safety:** always runs in a **dedicated worker**, killed and recreated after **1000ms** → `E_TIMEOUT` message: "This pattern took too long (possible catastrophic backtracking). Try making quantifiers more specific."
- **Flavor note:** JavaScript (ECMAScript) regex flavor; stated visibly.
- **Acceptance tests:** match/group results equal native `matchAll`; invalid pattern error message shown; `(a+)+$` against a long string times out and the UI stays responsive; replacement preview correct with named groups.
- *Clarified in Phase 4:* without `g`, only the first match is shown (as `exec`), and the status says so. Matching always adds `d` internally for group positions (it doesn't change results). The worker returns up to 5,000 matches (all are counted); the page lists 200 and highlights the first 200,000 characters, with a note when cut. `u` with `v` is refused with an explanation, and so is `v` where the browser lacks it. The explanation (shipped, not deferred) covers escapes, classes, groups (numbered, named, non-capturing), lookarounds, backreferences, quantifiers (greedy/lazy), anchors, alternation and literals; anything else is shown as "not explained". It reads the pattern without running it, so it runs on the page. Pattern, text and replacement are never stored; flags and mode are. The E2E test measured a 17 ms longest frame gap while `(a+)+$` was stopped. JavaScriptCore on Linux (CI WebKit) sometimes finishes `(a+)+$` and other catastrophic patterns at once with no match, so the timeout can't always be shown there. The test tries four catastrophic patterns (`(a+)+$`, `(a|aa)+$`, `(.*a){24}$`, a backreference): Chromium and Firefox must stop one with the timeout; WebKit may instead show the engine's own result. In every browser the page must stay responsive (frame gap under the 1 s timeout).

### 5.7 unix-timestamp-converter
- **Timestamp → date:** auto-detect unit by digit count (10 = seconds, 13 = milliseconds, 16 = microseconds; manual override). Shows ISO 8601 UTC, local time, chosen time zone, RFC 2822, relative time, day of week.
- **Date → timestamp:** date-time picker + time zone (from `Intl.supportedValuesOf("timeZone")`, default local) → seconds and milliseconds.
- **Live clock:** current Unix time updating each second, with a pause control. The value must not be in an `aria-live` region (screen readers must not announce every tick); a "Copy current" button provides it on demand.
- **Acceptance tests:** known timestamps ↔ dates in UTC and two zones including a DST boundary; unit auto-detection; negative timestamps (pre-1970); invalid input messages.
- *Clarified in Phase 4:* auto-detection by digit count (sign excluded): ≤ 11 digits seconds, 12–14 milliseconds, 15–17 microseconds; longer is rejected. Spaces, `_` and `,` are ignored; decimals are rejected with a hint to use milliseconds. One time zone picker (toolbar) serves both directions; the choice is remembered as an option. A date-time that doesn't exist (clocks moved forward) converts to the time the same distance after the change; one that happens twice (clocks moved back) converts to the first occurrence; both show a note. Zones the browser lists under old names (e.g. `Asia/Calcutta`) are shown under their current IANA name, and the old name stays searchable. RFC 2822 is shown for years 1900–9999 only.

### 5.8 uuid-generator
- **Generate:** UUID v4 (`crypto.randomUUID`, default), UUID v7 (time-ordered, implemented per RFC 9562 using `crypto.getRandomValues`), ULID (`ulid`). Quantity 1–1000 (default 1); options uppercase, without hyphens. Copy one / copy all / download `.txt`.
- **Inspect:** paste a UUID → version, variant, and embedded timestamp for v1/v6/v7; invalid format explained.
- **Acceptance tests:** format regex per version; version/variant bits correct; v7 values generated in sequence sort in time order; 1000 values unique; inspect decodes v7 timestamp correctly.
- *Clarified in Phase 4:* v4 uses `crypto.getRandomValues` (works outside secure contexts, unlike `crypto.randomUUID`). v7 uses RFC 9562 §6.2 method 1: `rand_a` is a 12-bit counter seeded in its lower half, so a batch sorts in order; on overflow the timestamp moves 1 ms ahead, and it never goes back if the clock does. ULIDs are implemented in the tool (no `ulid` dependency) and are monotonic within a millisecond; Uppercase/Hyphens don't apply to them. Values are generated after the page loads (never in the static HTML), on load and whenever type or quantity changes. Inspect accepts braces, `urn:uuid:` and missing hyphens; it decodes v1, v6 and v7 times (checked against RFC 9562 appendix A vectors), and recognises nil, max, non-RFC variants and ULIDs pasted by mistake.

### 5.9 hash-generator
- **Input:** text (UTF-8) or file.
- **Algorithms:** MD5, SHA-1, SHA-256 (default selected), SHA-384, SHA-512; show all selected at once.
- **Options:** output hex (default, lowercase) / HEX uppercase / Base64; HMAC mode with a key (SHA family).
- **Processing:** text via WebCrypto `subtle.digest` (SHA) and hash-wasm (MD5); **files streamed in chunks** with hash-wasm incremental hashing in a worker (no full-file buffering), with progress.
- **Verify:** "Compare with expected hash" field → match / no match (case-insensitive, whitespace trimmed).
- **Labels:** MD5 and SHA-1 marked "Not secure for passwords or signatures; fine for checksums."
- **Acceptance tests:** known test vectors for every algorithm (empty string, "abc", long string); HMAC vectors (RFC 4231 for SHA-256); 1 GB file hashed with flat memory usage (desktop); compare field logic.
- *Clarified in Phase 4:* text is hashed with hash-wasm too (not WebCrypto), so text and files share one code path and HMAC works the same for both; hash-wasm loads on the first input. Files are read in 4 MB slices in the worker (no full-file buffer); the 1 GB E2E test checks the SHA-256 against Node's, but memory isn't measured automatically. The HMAC key is text (UTF-8), held in memory only; MD5 is disabled with HMAC. Compare checks every selected algorithm: hex case-insensitively, Base64 exactly, ignoring whitespace and a `sha256:`-style prefix. File limits: desktop 1 GB soft / 8 GB hard, mobile 500 MB / 2 GB (streaming means memory isn't the constraint).
