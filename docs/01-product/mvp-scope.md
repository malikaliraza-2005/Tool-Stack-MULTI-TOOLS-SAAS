# MVP Scope

| | |
|---|---|
| **Last updated** | 2026-10-13 |
| **Related** | [product.md](product.md) · [tool-specifications.md](../04-architecture/tool-specifications.md) · [tool-registry.md](../04-architecture/tool-registry.md) |

This document defines **exactly** what ships in the MVP. Anything not listed here is out of scope until this document is updated.

---

## 1. Scope principles

1. **Quality over count.** A tool ships only when it meets the Definition of Done (§6).
2. **100% local processing.** Every MVP tool runs in the browser. No uploads, no external API calls.
3. **One search intent per tool page.** Two different jobs become two pages. (This is why the earlier "UUID & Hash generator" became two tools.)
4. **Permissive licenses only.** See [dependencies-licenses.md](../04-architecture/dependencies-licenses.md).
5. **Shared foundations first.** Tools reuse the Workbench, DropZone, and result components instead of reinventing UI.

---

## 2. MVP tools (19)

Slugs are **final** as of Phase 0 (D-11 in [risks-and-decisions.md](../06-delivery/risks-and-decisions.md); evidence in [keyword-research.md](../03-seo-growth/keyword-research.md)). They may change only before the first production deploy; once a page is indexed, its slug is permanent.

Priority: **P0** must ship at launch · **P1** ships at launch if ready, otherwise within weeks.

### 2.1 PDF tools (6)

| Slug | Tool | Main user | Why it's included | Priority |
|---|---|---|---|---|
| `merge-pdf` | Merge PDF | Everyday users, students | Very common task; files are often sensitive | P0 |
| `split-pdf` | Split PDF / Extract pages | Everyday users | Natural pair to merge | P0 |
| `organize-pdf` | Organize PDF (reorder, rotate, delete pages) | Everyday users | Showcases premium visual interaction | P0 |
| `jpg-to-pdf` | JPG to PDF (also PNG, WebP, HEIC) | Students, everyday users | Scans and phone photos into one document | P0 |
| `pdf-to-jpg` | PDF to JPG (PNG optional) | Everyday users, creators | Common export need | P1 |
| `sign-pdf` | Fill & Sign PDF | Job seekers, freelancers | High-value; contracts are sensitive. **Visual signature only, not a certified digital signature.** | P1 |

### 2.2 Image tools (4)

| Slug | Tool | Main user | Why it's included | Priority |
|---|---|---|---|---|
| `compress-image` | Compress Image | Everyone uploading images, creators | Constant need; strong before/after interaction | P0 |
| `convert-image` | Convert Image (JPG, PNG, WebP, AVIF, HEIC per D-6) | iPhone users, creators | HEIC→JPG is a frequent pain point | P0 |
| `resize-image` | Resize / Crop Image | Everyday users, creators | Common upload requirement | P0 |
| `remove-exif-data` | Remove EXIF / Location Data | Privacy-conscious users | Clearest expression of the privacy positioning | P0 |

A dedicated `heic-to-jpg` landing page (a preset of `convert-image`) is the first Tier 2 candidate after launch: HEIC is approved (D-6) and HEIC→JPG shows strong, privacy-related demand ([keyword-research.md](../03-seo-growth/keyword-research.md) §3.2).

### 2.3 Developer tools (9)

All share the **Workbench** layout (see [design-system.md](../02-design/design-system.md)).

| Slug | Tool | Why it's included | Priority |
|---|---|---|---|
| `json-formatter` | JSON Formatter, Validator & Viewer | Most-used developer utility | P0 |
| `jwt-decoder` | JWT Decoder & Verifier | Strong privacy story (tokens are secrets) | P0 |
| `base64-encode-decode` | Base64 Encode / Decode (text and files) | Daily developer and QA task | P0 |
| `url-encode-decode` | URL Encode / Decode + URL Parser | Daily task; parser adds value | P0 |
| `diff-checker` | Diff Checker | Broad technical use | P0 |
| `regex-tester` | Regex Tester | Top request in it-tools | P0 |
| `unix-timestamp-converter` | Unix Timestamp Converter | Daily task for developers and analysts | P0 |
| `uuid-generator` | UUID / ULID Generator | Common need; trivial to make excellent | P1 |
| `hash-generator` | Hash Generator (text and files) | File checksum verification is also useful to non-developers | P1 |

---

## 3. Global features

| ID | Feature | Priority |
|---|---|---|
| G-1 | **Command palette** (⌘K / Ctrl+K) searching tools by name, synonyms, and accepted file type; fully keyboard operable | P0 |
| G-2 | **Homepage drop zone:** a dropped file shows matching tools and is handed to the chosen tool without re-selecting | P0 |
| G-3 | **Smart paste:** pasted text is detected (JWT, JSON, Base64, Unix timestamp, URL-encoded text, URL) and the matching tool opens pre-filled | P1 |
| G-4 | **"0 bytes uploaded" indicator** on file tools, backed by CSP (`connect-src` restricted) | P0 |
| G-5 | **Offline support (PWA):** tools work offline after first visit; installable | P1 |
| G-6 | **Local preferences:** theme, favorites, recent tools, last-used options (localStorage; the site works without it) | P0 |
| G-7 | **Light / dark / system theme** with animated transition | P0 |
| G-8 | **Category hubs** (`/pdf-tools`, `/image-tools`, `/developer-tools`) and full tool index | P0 |
| G-9 | **Privacy page** explaining local processing, analytics, and how to verify with browser DevTools | P0 |
| G-10 | **About page** with accurate product facts (supports trust and GEO) | P0 |
| G-11 | **"Use in another tool"** hand-off between compatible tools (e.g. Organize → Sign) | P1 |

---

## 4. File and input limits **[Target]**

Validated during device testing and then stored per tool in the registry.

| Context | Soft warning | Hard limit |
|---|---|---|
| PDF tools, desktop | 100 MB total | 500 MB total |
| PDF tools, mobile | 50 MB total | 150 MB total |
| Image tools | 25 MB per image; 50 images per batch | 100 MB per image |
| Text/developer tools | 5 MB input | 50 MB input |

Above the soft warning: tool works but warns it may be slow. Above the hard limit: tool refuses with a clear explanation.

---

## 5. Not in the MVP

### 5.1 Tier 2: next, ordered by data after launch
JSON → TypeScript types · SQL formatter · cron expression explainer · color converter + WCAG contrast checker · JSON ↔ YAML/CSV/XML · code formatter/minifier (Prettier, lazy-loaded per language) · Markdown preview · SVG optimizer (SVGO) · cURL → code · QR code generator · password/secret generator · number base converter · case converter · HTML entities · JSON Schema validator · OCR (Tesseract.js) · tool chaining · `heic-to-jpg` preset page.

### 5.2 Deferred or excluded

| Item | Reason |
|---|---|
| Compress PDF | Quality engine (Ghostscript) is AGPL; browser-only alternatives give poor results |
| Background removal | Popular models (e.g. RMBG-1.4) are non-commercial; library licenses unverified |
| Video/audio conversion | ffmpeg.wasm is heavy, slow on mobile, and its core exceeds the 25 MiB file limit |
| API client, HTTP header/SSL/WHOIS checkers, IP lookup | Blocked by CORS without a server proxy |
| DNS lookup | Possible via public DNS-over-HTTPS, but sends data to a third party; later, clearly labelled |
| AI-powered tools | Require paid APIs |
| Keyword/backlink SEO tools | Require paid data |
| Accounts, sync, history in the cloud | Requires backend and database |
| Shareable result links | Privacy risk; reconsider later using URL fragments only, never for secrets |

---

## 6. Definition of Done (per tool)

A tool is done only when **all** are true:

1. Behaviour matches its section in [tool-specifications.md](../04-architecture/tool-specifications.md), including all listed error cases.
2. Processing logic has unit tests; the main flow has an end-to-end test.
3. E2E test proves **no network requests** are made during processing.
4. Works offline after first load (once G-5 ships).
5. Keyboard-only operation works; axe reports no violations; screen-reader announcements for results and errors.
6. Meets motion rules and performance budgets ([design-system.md](../02-design/design-system.md), [architecture.md](../04-architecture/architecture.md)).
7. Tested on Chrome, Firefox, Safari (macOS and iOS), and a mid-range Android phone.
8. Registry entry complete: unique title, description, H1, FAQs, related tools; structured data validates.
9. Supporting content written and reviewed for accuracy.
10. Every new dependency is recorded in the license register.

---

## 7. Changing the scope

Adding, removing, or swapping a tool requires:
1. A short reason (evidence from validation, Search Console, or user feedback).
2. An update to this document **and** the registry and specifications.
3. A decision record in [risks-and-decisions.md](../06-delivery/risks-and-decisions.md).
