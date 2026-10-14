# Tool Registry

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: implemented in `src/tools/`) |
| **Related** | [architecture.md](architecture.md) · [tool-specifications.md](tool-specifications.md) · [mvp-scope.md](../01-product/mvp-scope.md) |

The tool registry is the **single source of truth** about every tool. Pages, metadata, sitemap, search, hubs, drop-zone suggestions, smart paste, and related links are all generated from it. If information about a tool exists in two places, one of them is wrong.

---

## 1. Location

```
src/tools/
├─ types.ts          # ToolDefinition and related types
├─ schema.ts         # Zod schema mirroring the types (build-time validation)
├─ registry.ts       # imports every <slug>/meta.ts, validates, exports helpers
└─ <slug>/meta.ts    # one entry per tool
```

`meta.ts` files contain **data only**: no React, no processing libraries. The registry is imported by server components and by the small client search index, so it must stay light.

---

## 2. Schema

```ts
// src/tools/types.ts
export type ToolCategory = "pdf" | "image" | "developer";
export type ToolStatus = "live" | "beta" | "planned" | "hidden";

export interface ToolDefinition {
  /** URL segment, kebab-case, permanent once indexed. Must not collide with reserved routes. */
  slug: string;
  category: ToolCategory;
  status: ToolStatus;               // only "live" and "beta" are built and listed

  /** Display */
  name: string;                     // "Merge PDF"
  shortName?: string;               // for tight UI (palette, breadcrumbs)
  tagline: string;                  // one sentence under the H1
  icon: string;                     // Lucide icon name or custom glyph id

  /** Search inside Sprigkit (command palette, homepage) */
  keywords: string[];               // synonyms users might type: "combine pdf", "join pdf"

  /** SEO, used by generateMetadata, JSON-LD and the page */
  seo: {
    title: string;                  // ≤ ~60 chars, unique, e.g. "Merge PDF Online: Private, No Upload | Sprigkit"
    description: string;            // ≤ ~155 chars, unique
    h1: string;                     // unique
    faqs: { q: string; a: string }[]; // rendered visibly on the page; feeds FAQPage JSON-LD
    ogImage?: string;               // generated if omitted
  };

  /** Internal linking */
  related: string[];                // slugs; 3–5 recommended; must be registered or a planned MVP slug (§3 rule 4)

  /** Inputs, used by DropZone suggestions, file pickers, and smart paste */
  input: {
    kind: "files" | "text" | "both";
    accepts?: {                     // for file tools
      mime: string[];               // ["application/pdf"]
      extensions: string[];         // [".pdf"]
      multiple: boolean;
    };
    detect?: string[];              // ids of smart-paste detectors in src/lib/detect (text tools)
  };

  /** Limits, enforced before processing (see mvp-scope §4) */
  limits: {
    desktop: { softBytes: number; hardBytes: number; maxFiles?: number };
    mobile:  { softBytes: number; hardBytes: number; maxFiles?: number };
    per?: "file" | "total";         // bytes limit each file (default) or all files together (PDF tools)
  };

  /** Processing facts, shown in UI and checked by tests */
  processing: {
    local: true;                    // literal true: non-local tools are not allowed in the MVP
    worker: boolean;                // runs heavy work in a Web Worker
    offline: boolean;               // works offline after first load; false until the service worker ships (G-5, Phase 7)
  };

  /** Hand-off targets for "Use in another tool" */
  handoff?: string[];               // slugs that accept this tool's output

  /** Maintenance */
  addedAt: string;                  // ISO date
  updatedAt: string;                // ISO date, used as sitemap lastModified
}
```

`schema.ts` mirrors this with Zod. `registry.ts` validates every entry when the module loads (`assertValidRegistry` in `validate.ts`). Every tool page, the OG images and the sitemap import it at build time, so any error fails the build (verified 2026-10-14 by breaking an entry: `next build` stops with "Tool registry is invalid … related target "does-not-exist" not found").

---

## 3. Validation rules

The build fails if any of these are violated:

1. `slug` is unique, kebab-case, and not reserved (`about`, `privacy`, `terms`, `licenses`, `guides`, `pdf-tools`, `image-tools`, `developer-tools`, `api`, `_next`, `_gallery`, `og`, `icons`, `vendor`, `serwist`, `sitemap.xml`, `robots.txt`; list in `validate.ts`).
2. `seo.title`, `seo.description`, and `seo.h1` are **unique across all tools**.
3. `seo.title` ≤ 65 characters; `seo.description` between 70 and 160 characters.
4. Every slug in `related` and `handoff` exists and is not the tool itself. "Exists" means registered, or one of the final MVP slugs not built yet (`PLANNED_SLUGS` in `registry.ts`, from D-11). Pages only link to related tools that are live, so pilots can declare their final related tools now.
5. File tools (`kind: "files" | "both"`) have `accepts`; every id in `detect` points to an existing detector.
6. `limits.mobile` values ≤ `limits.desktop` values.
7. `processing.local === true`.
8. At least 3 FAQs for `live` tools.

Also checked: dates are ISO (`YYYY-MM-DD`) and `updatedAt` is not before `addedAt`; `softBytes ≤ hardBytes`. Each rule has a unit test in `src/tools/registry.test.ts`.

---

## 4. What the registry drives

| Consumer | Uses | Where |
|---|---|---|
| Static routes | `slug`, `status` | `app/[tool]/page.tsx` `generateStaticParams()` |
| Metadata | `seo.*`, `slug` | `generateMetadata()` via `lib/seo.ts` |
| JSON-LD | `name`, `seo.faqs`, `category` | `lib/seo.ts` |
| Page header & breadcrumbs | `name`, `seo.h1`, `tagline`, `category` | `components/tool/ToolPage` |
| Related tools | `related` | Bottom of tool page |
| Category hubs | `category`, `name`, `tagline` | `/pdf-tools`, `/image-tools`, `/developer-tools` |
| Homepage index | all live tools grouped by category | `components/home` |
| Command palette search | `name`, `shortName`, `keywords`, `category` | Generated `search-index.json` (build script) loaded by Fuse.js |
| DropZone suggestions | `input.accepts` | Homepage drop zone matches dropped files to tools |
| Smart paste | `input.detect` | `lib/detect` runs detectors, maps winners to slugs |
| Sitemap | `slug`, `updatedAt` | `app/sitemap.ts` |
| Limits | `limits` | `lib/files` checks before reading |
| Hand-off | `handoff` | ResultPanel "Use in another tool" |

---

## 5. Smart-paste detectors

Detectors live in `src/lib/detect/`, one function per type, returning a confidence from 0 to 1. They must be **fast (≤ 1ms on 10 KB), side-effect free, and never send data anywhere**.

| Detector id | Matches | Tool |
|---|---|---|
| `jwt` | Three base64url segments separated by dots; header decodes to JSON with `alg` | `jwt-decoder` |
| `json` | Trimmed text starts with `{` or `[` and parses | `json-formatter` |
| `unix-timestamp` | 10, 13, or 16 digit integer in a plausible date range | `unix-timestamp-converter` |
| `url-encoded` | Contains `%[0-9A-Fa-f]{2}` sequences and decodes cleanly | `url-encode-decode` |
| `url` | Parses with `new URL()` and has http(s) scheme | `url-encode-decode` (parser mode) |
| `base64` | Base64 alphabet, valid padding/length, ≥ 16 chars, decodes to mostly printable text or known magic bytes | `base64-encode-decode` |
| `uuid` | RFC 9562 UUID format | `uuid-generator` (inspect mode) |

When several match, the highest confidence wins; ties show a short choice list. Order of precedence for ties: `jwt` > `json` > `url` > `url-encoded` > `unix-timestamp` > `uuid` > `base64`.

---

## 6. Example entries

```ts
// src/tools/merge-pdf/meta.ts
import type { ToolDefinition } from "../types";

export const meta: ToolDefinition = {
  slug: "merge-pdf",
  category: "pdf",
  status: "live",
  name: "Merge PDF",
  tagline: "Combine PDF files into one document, right in your browser. Nothing is uploaded.",
  icon: "files",
  keywords: ["combine pdf", "join pdf", "merge pdf files", "pdf merger", "append pdf"],
  seo: {
    title: "Merge PDF Online: Private, No Upload | Sprigkit",
    description:
      "Combine multiple PDF files into one in seconds. Files are processed on your device and never uploaded. Free, no sign-up.",
    h1: "Merge PDF files",
    faqs: [
      { q: "Are my PDF files uploaded to a server?", a: "No. …" },
      { q: "Can I merge password-protected PDFs?", a: "…" },
      { q: "Is there a file size limit?", a: "…" },
    ],
  },
  related: ["split-pdf", "organize-pdf", "jpg-to-pdf", "sign-pdf"],
  input: {
    kind: "files",
    accepts: { mime: ["application/pdf"], extensions: [".pdf"], multiple: true },
  },
  limits: {
    desktop: { softBytes: 100 * 2 ** 20, hardBytes: 500 * 2 ** 20, maxFiles: 100 },
    mobile:  { softBytes: 50 * 2 ** 20,  hardBytes: 150 * 2 ** 20, maxFiles: 50 },
  },
  processing: { local: true, worker: true, offline: true },
  handoff: ["organize-pdf", "sign-pdf", "split-pdf"],
  addedAt: "2026-10-13",
  updatedAt: "2026-10-13",
};
```

```ts
// src/tools/jwt-decoder/meta.ts
export const meta: ToolDefinition = {
  slug: "jwt-decoder",
  category: "developer",
  status: "live",
  name: "JWT Decoder",
  tagline: "Decode and verify JSON Web Tokens locally. Your token never leaves your browser.",
  icon: "key-round",
  keywords: ["jwt", "decode jwt", "json web token", "jwt verify", "jwt parser", "bearer token"],
  seo: {
    title: "JWT Decoder & Verifier: Decode Tokens Locally | Sprigkit",
    description:
      "Decode JWT header and payload, check expiry, and verify signatures with your key, all in your browser. Tokens are never sent anywhere.",
    h1: "JWT decoder and verifier",
    faqs: [/* … */],
  },
  related: ["base64-encode-decode", "json-formatter", "unix-timestamp-converter", "hash-generator"],
  input: { kind: "text", detect: ["jwt"] },
  limits: {
    desktop: { softBytes: 64 * 2 ** 10, hardBytes: 1 * 2 ** 20 },
    mobile:  { softBytes: 64 * 2 ** 10, hardBytes: 1 * 2 ** 20 },
  },
  processing: { local: true, worker: false, offline: true },
  addedAt: "2026-10-13",
  updatedAt: "2026-10-13",
};
```

Copy in examples is illustrative; final titles, descriptions, and FAQs come from `03-seo-growth/page-seo-specs.md` after keyword validation.

---

## 7. Adding a new tool (checklist)

Updated after the Phase 3 pilots (P3-T25).

1. Confirm the tool is in [mvp-scope.md](../01-product/mvp-scope.md) (or update scope first).
2. Write its section in [tool-specifications.md](tool-specifications.md).
3. Add any new dependency to [dependencies-licenses.md](dependencies-licenses.md) (license must be allowed) and run `npm run licenses`.
4. Create `src/tools/<slug>/`:
   - `meta.ts`: registry entry (data only)
   - `logic.ts` + `logic.test.ts`: pure processing + unit tests (write tests from the spec's acceptance tests). Fixtures that can be generated (e.g. PDFs with pdf-lib) go in `__fixtures__/*.ts`, so no binaries are committed and E2E tests can reuse them
   - `logic.worker.ts`: if heavy, using `expose()` from `src/lib/worker/expose.ts`; the UI runs it with `createWorkerRunner` (transfer `ArrayBuffer`s)
   - `ui.tsx`: client UI (default export) using the shared components in `src/components/tool/` (Workbench + CodeEditor, or DropZone + FileList + ProcessingState + ResultPanel)
   - `content.tsx`: supporting content (default export) built from `src/components/tool/content.tsx`
   - `constants.ts` (optional): small values the UI needs eagerly, so it never imports `logic.ts` at module level
5. Register it in three places: the meta in `src/tools/registry.ts` (`TOOLS`), the UI in `src/components/tool/ToolLoader.tsx`, the content in `src/tools/content.ts`. A missing UI or content fails the build.
6. **Keep heavy code out of `ui.tsx`'s static imports.** Import `logic.ts` with `import type` only, and load libraries with `import()` on intent. Check the page's JS with Lighthouse (`npm run lhci`).
7. Add `e2e/tools/<slug>.spec.ts` (import `test` from `../fixtures`, so the **no-network** and CSP checks run): main flow, every error case, keyboard-only use, `expectNoA11yViolations` in both themes for the empty, working and result states. Add the page URL to `lighthouserc.cjs`.
8. Run `typecheck`, `lint`, `test`, `build`, `e2e`, `lhci`, `licenses`; fix everything.
9. Check the Definition of Done in [mvp-scope.md](../01-product/mvp-scope.md) §6.

Lessons from the pilots:
- Files chosen before the page hydrated fire no React event (seen in WebKit). `DropZone` picks them up on mount; tool-specific file inputs must do the same.
- Never put large text in a plain `<textarea>` or other unvirtualized element: layout of 20 MB of text froze the page for 30+ s. `CodeEditor` handles this; use it for any large text.
- Number and string values must be copied from the source, not round-tripped through `JSON.parse`, or big integers change.

## 8. MVP registry summary

Slugs are final (D-11 in [risks-and-decisions.md](../06-delivery/risks-and-decisions.md)).

| Slug | Category | Input | Worker | Detector | Handoff |
|---|---|---|---|---|---|
| `merge-pdf` | pdf | files (PDF, multiple) | yes | | organize-pdf, sign-pdf, split-pdf |
| `split-pdf` | pdf | files (PDF, single) | yes | | merge-pdf, organize-pdf |
| `organize-pdf` | pdf | files (PDF, single) | yes | | sign-pdf, split-pdf, pdf-to-jpg |
| `jpg-to-pdf` | pdf | files (images, multiple) | yes | | merge-pdf, organize-pdf, sign-pdf |
| `pdf-to-jpg` | pdf | files (PDF, single) | yes | | compress-image, resize-image |
| `sign-pdf` | pdf | files (PDF, single) | yes | | merge-pdf |
| `compress-image` | image | files (images, multiple) | yes | | jpg-to-pdf, remove-exif-data |
| `convert-image` | image | files (images, multiple) | yes | | compress-image, jpg-to-pdf |
| `resize-image` | image | files (images, multiple) | yes | | compress-image, jpg-to-pdf |
| `remove-exif-data` | image | files (images, multiple) | yes | | compress-image |
| `json-formatter` | developer | text / file | for > 1 MB | `json` | |
| `jwt-decoder` | developer | text | no | `jwt` | |
| `base64-encode-decode` | developer | text / file | for files | `base64` | |
| `url-encode-decode` | developer | text | no | `url`, `url-encoded` | |
| `diff-checker` | developer | text / file | yes | | |
| `regex-tester` | developer | text | **always** (timeout) | | |
| `unix-timestamp-converter` | developer | text | no | `unix-timestamp` | |
| `uuid-generator` | developer | none / text (inspect) | no | `uuid` | |
| `hash-generator` | developer | text / file | for files | | |
