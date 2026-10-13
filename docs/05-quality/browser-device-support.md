# Browser & Device Support

| | |
|---|---|
| **Last updated** | 2026-10-13 (initial matrix, Phase 1) |
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

## 2. Platform features we rely on

| Feature | Used for | Notes |
|---|---|---|
| Module Web Workers (`new Worker(url, { type: "module" })`) | All heavy processing | Turbopack's worker bootstrap fails in WebKit, so builds use webpack (D-14) |
| WebAssembly + `'wasm-unsafe-eval'` CSP | jSquash codecs, optional pdf.js decoders | Verified in all three engines (P1-T19) |
| Transferable `ArrayBuffer`s | Zero-copy files to/from workers | Verified (P1-T21) |
| Service Worker + Cache Storage | Offline (Phase 7) | Automated offline test runs in Chromium only (Playwright limitation); check Safari manually |
| `OffscreenCanvas`, `createImageBitmap` | Image tools | Check per tool in Phase 6 |
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
