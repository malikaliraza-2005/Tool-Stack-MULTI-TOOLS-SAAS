# Dependencies & Licenses

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: platform and pilot dependencies installed and pinned) |
| **Source** | Versions and license fields read from the npm registry (`registry.npmjs.org/<pkg>/latest`) on 2026-10-13 **[Verified]** |
| **Related** | [architecture.md](architecture.md) · [tool-specifications.md](tool-specifications.md) |

Versions below were the **latest published at the time of writing**. Packages installed at scaffold (Phase 1, P1-T07) are **pinned to exact versions** in `package.json` (`save-exact=true` in `.npmrc`) and marked **📌** in the tables; the others are pinned when they are added.

> The npm `license` field is what the package author declares. Before shipping, also read each package's LICENSE file and check bundled third-party code (e.g. WASM builds of C libraries), which can carry a different license.

---

## 1. License policy

| Category | Licenses | Rule |
|---|---|---|
| ✅ **Allowed** | MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, Unlicense, CC0-1.0; fonts: OFL-1.1 | Use freely; keep license notices |
| ⚠️ **Review required** | MPL-2.0, LGPL-2.1/3.0, dual licenses containing these, CC-BY | Document how obligations are met before use (see §4). Approved exceptions: `libheif-js` (LGPL-3.0, D-6); `@axe-core/playwright` (MPL-2.0, dev-only) |
| ❌ **Forbidden** | GPL (any version), AGPL, SSPL, BUSL, "non-commercial" (e.g. CC-BY-NC, model licenses restricting commercial use), "no license" | Never ship |

Additional rules:
1. **Free for commercial use** is required for every runtime dependency and asset (code, fonts, icons, WASM, ML models).
2. Prefer browser-native APIs over a dependency.
3. Every runtime dependency needs a reason, a size note, and a load strategy (initial vs on-intent).
4. Services (hosting, analytics) are classified separately in [product.md](../01-product/product.md) §7.

---

## 2. Runtime dependencies

### 2.1 Framework and UI

| Package | Version | License | Status | Purpose | Load |
|---|---|---|---|---|---|
| `next` | 16.4.3 📌 | MIT | ✅ | Framework, static export | Initial |
| `react`, `react-dom` | 19.3.0 📌 | MIT | ✅ | UI | Initial |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3 📌 | MIT | ✅ | Styling (build time, PostCSS plugin; works with webpack, D-14) | Build |
| `radix-ui` | 1.8.1 📌 | MIT | ✅ | Accessible primitives (Dialog, DropdownMenu, Popover, Select, Tabs, Tooltip, Checkbox, RadioGroup, Switch, Slider, Slot), restyled with tokens in `src/components/ui/` | Initial (shell: Tooltip, DropdownMenu, Dialog) / with the component |
| `cmdk` | 1.1.1 📌 | MIT | ✅ | Command palette, Combobox list | On open (palette chunk fetched on trigger hover/focus or first open) |
| `sonner` | 2.0.8 📌 | MIT | ✅ | Toasts (unstyled mode, restyled with tokens). Injects its base CSS via a `<style>` tag (allowed by `style-src 'unsafe-inline'`) | Initial (small) |
| `motion` | 14.2.0 📌 | MIT | ✅ | Layout animations (`layoutId` indicators), later drag/reorder, via `LazyMotion` + `m`. Pulls in `framer-motion`, `motion-dom`, `motion-utils` (MIT) | Initial: `m` only; `domMax` features loaded async after hydration |
| `lucide-react` | 1.56.0 📌 | ISC | ✅ | Icons (tree-shaken) | Initial |
| `fuse.js` | 7.5.0 | Apache-2.0 | ✅ | Fuzzy tool search | On palette open |
| `zod` | 4.6.7 📌 | MIT | ✅ | Registry validation (full `zod`, build time only); tool option schemas in the browser use `zod/mini` (tree-shakable) | Build / small runtime |
| `@tanstack/react-virtual` | 3.14.18 📌 | MIT | ✅ | Virtualized lists (JSON tree view; later page grid, diff). 3.14.19 was skipped: published the day before install | With tool |
| `serwist`, `@serwist/turbopack` | 9.5.13 | MIT | ✅ | Service worker / PWA. Spike (P1-T22) used `@serwist/turbopack` (route-handler integration; works with webpack builds), not `@serwist/next`. Needs `esbuild` (MIT) as a dev dependency to bundle the SW. Install in Phase 7 | Build + SW |
| `geist` | 1.7.2 📌 | OFL-1.1 (npm field: "SIL OPEN FONT LICENSE"; `LICENSE.TXT` read 2026-10-13) | ✅ | Geist Sans & Mono variable fonts via `next/font/local`, self-hosted (P1-T25). Chosen over `@fontsource-variable/geist` because it plugs into `next/font` (preload, fallback metrics) | Initial (2 preloaded `.woff2`) |

### 2.2 PDF

| Package | Version | License | Status | Used by | Load |
|---|---|---|---|---|---|
| `pdf-lib` | 1.17.1 📌 | MIT | ✅ | merge, split, organize, jpg-to-pdf, sign. Depends on `pako` 1.0.11 (MIT AND Zlib), see §3.1 | On intent (worker) |
| `pdfjs-dist` | 6.4.299 📌 | Apache-2.0 | ✅ | FileList thumbnails (Phase 3), pdf-to-jpg, sign preview. No `eval` in 6.x (P1-T20). Its `wasm/`, `cmaps/`, `standard_fonts/`, `iccs/` are self-hosted by `scripts/copy-pdfjs-assets.mjs` (licenses below) | On intent (library + worker) |
| `signature_pad` | 5.1.4 | MIT | ✅ | sign-pdf drawn signatures | On intent |

**pdf.js runtime assets** (`node_modules/pdfjs-dist`, LICENSE files read 2026-10-14 **[Verified]**), served from `/vendor/pdfjs-6.4.299/`: `jbig2.wasm` (PDFium, BSD-3-Clause; pdf.js wrapper Apache-2.0), `openjpeg.wasm` (OpenJPEG, BSD-2-Clause; wrapper BSD-2-Clause), `qcms_bg.wasm` (qcms, MIT), CMaps and standard fonts (pdf.js, Apache-2.0 / bundled font licenses), `iccs/` (CC0-1.0). Not copied: `quickjs-eval.*` (JavaScript inside PDFs, never enabled). All permissive; the `/licenses` page must list them.

Note: `pdf-lib` has not had a release in a long time (1.17.1). It is stable and widely used, but track issues; a maintained fork may be adopted later if needed.

### 2.3 Image

| Package | Version | License | Status | Used by | Load |
|---|---|---|---|---|---|
| `@jsquash/jpeg` | 1.6.0 | Apache-2.0 | ✅ | compress, convert, resize | On intent (worker, WASM) |
| `@jsquash/png` | 3.1.1 | Apache-2.0 | ✅ | compress, convert, resize | On intent |
| `@jsquash/webp` | 1.5.0 | Apache-2.0 | ✅ | compress, convert, resize | On intent |
| `@jsquash/avif` | 2.1.1 | Apache-2.0 | ✅ | compress, convert, resize | On intent |
| `@jsquash/oxipng` | 2.3.0 | Apache-2.0 | ✅ | Lossless PNG optimization | On intent |
| `@jsquash/resize` | 2.1.1 | Apache-2.0 | ✅ | High-quality resampling | On intent |
| `exifr` | 7.1.3 | MIT | ✅ | Read EXIF/GPS (remove-exif-data, orientation) | On intent |
| `piexifjs` | 1.0.6 | MIT | ✅ | Lossless JPEG EXIF removal | On intent |
| `libheif-js` | 1.23.5 | **LGPL-3.0** | ✅ under D-6 conditions only | HEIC/HEIF decoding (convert-image, jpg-to-pdf input) | On intent (worker); `libheif-wasm` build served as a separate, unmodified file, never bundled |
| `pica` | 10.0.3 | MIT | ✅ (optional) | Alternative resampler if `@jsquash/resize` is unsuitable | Not planned |

**Upstream codec licenses** (package tarballs read 2026-10-13 **[Verified]**; package code itself is Apache-2.0):

| Package | Bundled codec notice (`LICENSE.codec.md`) |
|---|---|
| `@jsquash/jpeg` | libjpeg-turbo / mozjpeg: IJG License + BSD-3-Clause (+ zlib for SIMD parts) |
| `@jsquash/webp` | libwebp: BSD-3-Clause (Google) |
| `@jsquash/png` | BSD-3-Clause-style (Google) |
| `@jsquash/oxipng` | oxipng: MIT |
| `@jsquash/resize` | hqx: Apache-2.0; magic-kernel: MIT; resize: MIT |
| `@jsquash/avif` | **No codec license file shipped.** Upstream libavif and libaom are BSD-2-Clause **[Unverified]**; confirm and add notices before Phase 6 |

All permissive. The `/licenses` page must reproduce these notices (BSD/IJG attribution terms).

### 2.4 Developer tools

| Package | Version | License | Status | Used by | Load |
|---|---|---|---|---|---|
| `@codemirror/state`, `view`, `commands`, `language`, `lang-json`; `@lezer/highlight` | 6.7.6, 6.43.14, 6.11.1, 6.13.1, 6.0.2; 1.2.5 📌 | MIT | ✅ | Workbench editor (`CodeEditor`). Individual packages instead of the `codemirror` meta-package (only the extensions we use) | On intent (hover, focus or content) |
| `jsonc-parser` | 3.3.1 📌 | MIT | ✅ | JSON parsing with error offsets, JSONC | On first input (main thread ≤ 1 MB, worker above) |
| `jose` | 6.2.12 | MIT | ✅ | JWT signature verification | On verify |
| `diff` | 9.0.0 | BSD-3-Clause | ✅ | diff-checker | With tool (worker) |
| `hash-wasm` | 4.12.0 | MIT | ✅ | MD5, streaming file hashes | On intent (worker) |
| ~~`ulid`~~ | n/a | MIT | Not used | ULID generation is ~20 lines in `uuid-generator/logic.ts` (Phase 4), so no dependency | n/a |
| `dompurify` | 3.4.17 | MPL-2.0 OR Apache-2.0 | ✅ (use under Apache-2.0) | Sanitizing any user-provided markup (Tier 2 previews) | Tier 2 |

### 2.5 Shared

| Package | Version | License | Status | Purpose | Load |
|---|---|---|---|---|---|
| `fflate` | 0.8.3 📌 | MIT | ✅ | ZIP for multi-file downloads (`src/lib/files/zip.ts`; first used in Phase 5) | On intent |

### 2.6 Native browser APIs used instead of dependencies
`crypto.randomUUID`, `crypto.getRandomValues`, `crypto.subtle` (SHA, HMAC), `TextEncoder/Decoder`, `URL`, `Intl` (time zones, dates), `OffscreenCanvas`, `createImageBitmap`, `CompressionStream` (if needed), View Transitions API, File System Access API (progressive enhancement only).

---

## 3. Development-only dependencies

| Package | Version | License | Status | Purpose |
|---|---|---|---|---|
| `typescript` | 5.9.3 📌 | Apache-2.0 | ✅ | Type checking. `latest` on npm is 7.0.2 (native compiler); 5.9 kept because the `create-next-app` 16.4 template targets `^5` and the Next TS plugin is untested on 7. Revisit in Phase 9 |
| `@types/node`, `@types/react`, `@types/react-dom` | 24.19.2 / 19.3.0 / 19.3.0 📌 | MIT | ✅ | Types (Node 24 LTS matches `.node-version`) |
| `vitest` | 5.0.4 📌 | MIT | ✅ | Unit tests |
| `@playwright/test` | 1.64.0 📌 | Apache-2.0 | ✅ | E2E tests |
| `@axe-core/playwright` (+ `axe-core`) | 4.13.0 📌 | MPL-2.0 | ⚠️ Acceptable | Accessibility tests. Dev-only, unmodified, never shipped to users → MPL obligations not triggered |
| `@lhci/cli` | 0.15.1 📌 | Apache-2.0 | ✅ | Lighthouse CI. `npm audit` reports advisories in its transitive dev-only tree (e.g. `tmp`, `uuid`, `basic-ftp`); production tree: 0 vulnerabilities (2026-10-13) |
| `wrangler` | 4.150.0 | MIT OR Apache-2.0 | ✅ (optional) | Not installed. Local headers/clean URLs are emulated by `scripts/serve-out.mjs` instead |
| `license-checker-rseidelsohn` | 5.0.1 📌 | BSD-3-Clause | ✅ | License report and CI gate (`npm run licenses`) |
| `eslint` | 9.39.5 📌 | MIT | ✅ | Lint. ESLint 10 exists; 9 kept to match `eslint-config-next` 16.4 as scaffolded |
| `eslint-config-next` | 16.4.3 📌 | MIT | ✅ | Next.js lint rules (core-web-vitals + TypeScript) |
| `eslint-config-prettier` | 10.1.8 📌 | MIT | ✅ | Turns off rules that conflict with Prettier |
| `prettier` | 3.9.10 📌 | MIT | ✅ | Formatting |

### 3.1 Build-time and dev-only transitive licenses (license gate findings, 2026-10-13)

`npm run licenses` checks the production tree against the §1 allow-list and the whole tree against the forbidden list. These non-allow-list licenses were found and accepted because the code is **never shipped to users** (not in `out/`):

| Package | License | Why it is present | Gate rule |
|---|---|---|---|
| `@img/sharp-*` (platform binaries, incl. `sharp-libvips-*`) | Apache-2.0 AND LGPL-3.0-or-later (libvips) | Optional dependency of `next` for server image optimization. Never executed: `images.unoptimized` + static export | Production exception by name prefix |
| `caniuse-lite` | CC-BY-4.0 | Browser-support data read by build tools (browserslist) | Production exception by name |
| `lightningcss`, `axe-core` | MPL-2.0 | Tailwind's CSS compiler; axe engine | Dev-only, allowed (not forbidden) |
| `glob`, `minimatch`, `lru-cache`, … | BlueOak-1.0.0 | Dev tooling | Dev-only, allowed |
| `argparse` | Python-2.0 | Dev tooling | Dev-only, allowed |
| `spdx-exceptions` / `spdx-ranges` | CC-BY-3.0 | License-checker data | Dev-only, allowed |
| `pako` 1.0.11 | MIT AND Zlib | Deflate inside `pdf-lib` (shipped in the merge-pdf worker) | Production exception by name (Phase 3). Zlib is permissive (attribution only) but not on the §1 allow-list. **Owner review requested:** add Zlib to the allow-list, or keep the exception |

The exception list lives in `scripts/check-licenses.mjs` and must stay in sync with this table. **Owner review requested** for the two production-tree exceptions (LGPL/CC-BY are "review required" in §1); they would only matter if the files were distributed, which they are not.

---

## 4. Under review

| Item | License | Issue | Decision path |
|---|---|---|---|
| **HEIC decoding**: `libheif-js` 1.23.5 | **LGPL-3.0** (libheif and libde265; LICENSE files read 2026-10-13 **[Verified]**) | Resolved | **Approved by D-6** in [risks-and-decisions.md](../06-delivery/risks-and-decisions.md#d-6-heic-support), only under its five conditions: separate unmodified file loaded on intent; LGPL-3.0 + GPL-3.0 texts shipped; corresponding source linked **and** self-hosted; prominent notice on convert-image; CI allows LGPL for this package name only. At scaffold, confirm which codecs are linked into the WASM (no x265 found; dav1d/OpenJPEG/vvdec names present) |

No other items are under review.

---

## 5. Explicitly rejected

| Item | License / reason |
|---|---|
| it-tools source code | GPL-3.0: cannot copy code (ideas only) |
| Ghostscript (WASM builds) for PDF compression | AGPL |
| RMBG-1.4 background-removal model | Non-commercial license |
| `@imgly/background-removal` | License not verified; depends on model licensing; deferred with background removal |
| ffmpeg.wasm core | Size (> 25 MiB per-file limit) and GPL/LGPL build variants |
| `heic-to` | LGPL-3.0 wrapper around libheif; default build uses `new Function` (incompatible with our CSP); adds nothing over `libheif-js` (D-6) |
| `heic2any` | Bundles libheif (LGPL obligations still apply); unmaintained (0.0.4) |
| Any CDN-hosted library at runtime | Breaks local-only/CSP guarantee: everything is self-hosted |

---

## 6. Adding or updating a dependency

1. Check whether a browser API already does the job.
2. Check license on npm **and** in the repository LICENSE/NOTICE, including bundled third-party code.
3. Check maintenance (last release, open issues), bundle size, and whether it can load on intent.
4. Add a row to this document (version, license, status, purpose, load).
5. CI runs `npm run licenses` (`scripts/check-licenses.mjs`, built on `license-checker-rseidelsohn`) with an allow-list matching §1; a forbidden or unknown license fails the build. Name-scoped exceptions are listed in §3.1 and in the script.
6. Major version upgrades: read the changelog, run full E2E and Lighthouse before merging.

---

### 3.2 Scripts that use dev dependencies

| Script | Uses | Notes |
|---|---|---|
| `scripts/generate-icons.mjs` | `@playwright/test` (Chromium) | Renders `src/app/icon.svg` to the favicon/app-icon PNGs and ICO. Run manually; outputs are committed (brand-identity §4.3) |
| `scripts/eslint/no-hardcoded-design.mjs` | `eslint` | Local lint rule enforcing design tokens |

No utility class-merging library (`clsx`, `tailwind-merge`, `class-variance-authority`) is used: `src/lib/cn.ts` only joins classes, and components avoid overlapping variant classes instead (browser API first, §1 rule 2).

## 7. Attribution

A `/licenses` page (or section of `/about`) lists third-party open-source software with licenses, generated at build time from the license report. Required by MIT/BSD/Apache notice terms and by LGPL if HEIC ships.
