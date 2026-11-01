# Browser & Device Support

| | |
|---|---|
| **Last updated** | 2026-10-14 (build targets and startup notice, Phase 3) |
| **Related** | [testing-strategy.md](testing-strategy.md) · [architecture.md](../04-architecture/architecture.md) · [phase-09](../06-delivery/phases/phase-09-quality-hardening.md) |

Initial matrix. Phase 9 extends it with real-device results and per-tool memory limits.

## 1. Supported browsers **[Target]**

The current and previous major versions of:

| Engine | Browsers | Automated (Playwright) | Manual (Phase 9) |
|---|---|---|---|
| Chromium | Chrome, Edge, Samsung Internet, Opera | `chromium` (desktop), `mobile` (Pixel 7 viewport) | Android phone (Chrome) |
| Gecko | Firefox | `firefox` (desktop) | — |
| WebKit | Safari (macOS, iOS, iPadOS); every iOS browser | `webkit` (desktop) | iPhone (Safari), Mac (Safari) |

Not supported: Internet Explorer, browsers without ES modules in workers, and browsers without WebAssembly. Pages without JavaScript still show their content but tools need JavaScript.

**Build targets [Verified 2026-10-14]:** Next.js 16 compiles for Chrome/Edge 111+, Firefox 111+ and Safari 16.4+ (iOS 16.4+), its default modern browserslist. In older browsers the page renders but no script runs. Since Phase 3 an inline, ES5-only check (`src/lib/startup-check.ts`) then shows a notice: "Sprigkit's tools couldn't start in this browser…". It appears when a site script fails to load or parse, or when the app hasn't started 20 s after load. File pickers are native `<label>`s, so they open even then, but chosen files are only handled once the app runs.

## 2. Platform features we rely on

| Feature | Used for | Notes |
|---|---|---|
| Module Web Workers (`new Worker(url, { type: "module" })`) | All heavy processing | Turbopack's worker bootstrap fails in WebKit, so builds use webpack (D-14) |
| WebAssembly + `'wasm-unsafe-eval'` CSP | jSquash codecs, optional pdf.js decoders | Verified in all three engines (P1-T19) |
| Transferable `ArrayBuffer`s | Zero-copy files to/from workers | Verified (P1-T21) |
| Service Worker + Cache Storage | Offline (Phase 7) | Automated offline test runs in Chromium only (Playwright limitation); check Safari manually |
| `OffscreenCanvas`, `createImageBitmap` | Image tools | *Phase 6:* the image worker decodes with `createImageBitmap` + `OffscreenCanvas` first. Playwright's WebKit (Windows) has no `OffscreenCanvas` in workers, so every format has a fallback: WASM decoders (JPG, PNG, WebP, AVIF), libheif (HEIC) and small JS decoders (GIF, BMP). Real Safari has it since 16.4 |
| View Transitions API | Motion | Progressive enhancement; must work without it |
| File System Access API | Saving | Progressive enhancement; download fallback everywhere |

## 3. Phase 1 results

Automated runs on 2026-10-13 (Playwright 1.64.0: Chromium, Firefox, WebKit 27.2, Pixel 7 emulation; Windows host):

| Check | Chromium | Firefox | WebKit | Mobile |
|---|---|---|---|---|
| Pages render under CSP; 404; clean URLs; fonts self-hosted | ✅ | ✅ | ✅ | ✅ |
| Cross-origin `fetch()` blocked by CSP | ✅ | ✅ | ✅ | ✅ |
| Hydration under CSP (spike) | ✅ | ✅ | ✅ | ✅ |
| jSquash WASM in worker (spike, webpack) | ✅ | ✅ | ✅ | ✅ |
| pdf.js render (spike, webpack) | ✅ | ✅ | ✅ | ✅ |
| pdf-lib merge in worker (spike, webpack) | ✅ | ✅ | ✅ | ✅ |
| Any Turbopack-built worker | ✅ | ✅ | ❌ | ✅ |
| Service worker precache + offline (spike) | ✅ | not automated | not automated | ✅ |

Playwright's WebKit is close to Safari but is not Safari. Real iOS/macOS Safari has not been tested yet (Phase 9).

## 4. Device limits

Per-tool limits (file size, page count, megapixels) come from the registry ([tool-registry.md](../04-architecture/tool-registry.md)) and are tuned on real devices in Phase 9 (R-3).

**Phase 5 findings (emulated, 2026-11-01):** every PDF tool passes on Playwright Chromium, Firefox, WebKit, Pixel 7 and iPhone 14. PDF to JPG caps canvases at 16,777,216 px on phones and tablets (iOS Safari's limit) and 100 megapixels on desktop, reducing larger pages and saying so. Organize PDF stays responsive with 300 pages (183 ms longest frame gap, desktop Chromium). Not yet measured: memory on real phones with large PDFs (P9-T01).

**Phase 6 findings (emulated, 2026-11-01):** the four image tools and jpg-to-pdf pass on Playwright Chromium, Firefox, WebKit, Pixel 7 and iPhone 14, including HEIC (libheif, D-6) in every engine. Limits: 25 MB soft / 100 MB hard per image, 50 images; images above **120 megapixels (50 on phones and tablets)** are refused before decoding (`MAX_PIXELS` in `useImageBatch`); phones process one image at a time, desktops two. A 40 MP JPEG compresses in desktop Chromium, with 2048 px previews in the slider. **AVIF encoding is slow:** a 12 MP photo took about 30 s (AVIF, libavif speed 6) against 5 s (WebP) in desktop Chromium; phones use speed 8 (about 2.4× faster, about 10% larger) and every tool shows a note when AVIF is chosen (risk table fallback). Not yet measured: AVIF timing and memory on real phones (P9-T01, P9-T11).
