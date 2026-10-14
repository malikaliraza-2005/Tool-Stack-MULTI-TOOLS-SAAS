# Security & Privacy

| | |
|---|---|
| **Last updated** | 2026-10-14 (Phase 3: rules as implemented by the tool platform) |
| **Related** | [architecture.md §11](architecture.md#11-security-and-privacy) · [tool-specifications.md §2.6](tool-specifications.md#26-privacy) · [testing-strategy.md](../05-quality/testing-strategy.md) · [dependencies-licenses.md](dependencies-licenses.md) |

Sprigkit's promise is literal: **what you put into a tool never leaves your device.** This document says what that protects, how it is enforced, and how it is tested.

---

## 1. Threat model

| # | Threat | Example | Mitigation |
|---|---|---|---|
| T1 | User data sent to a server | A bug or dependency uploads a PDF or posts JSON somewhere | No backend exists (A-1). CSP `connect-src 'self' blob: data:` blocks fetch/XHR/WebSocket/beacons to any other origin. E2E `noNetwork` fixture fails any test that makes a cross-origin request |
| T2 | User data persisted | Content left in `localStorage`, the URL, logs or analytics | `src/lib/storage.ts` stores only schema-validated options, max 2 KB per value, only under `ts:v1:` keys. Inputs are never put in the URL. No analytics yet (if added: content never sent, disclosed on /privacy) |
| T3 | Malicious input file | A crafted PDF or a file renamed to `.pdf` | Types are detected by magic bytes (`src/lib/files/sniff.ts`), not extensions. Parsing runs in a worker (pdf-lib) or pdf.js's own worker; failures map to `E_CORRUPT`/`E_UNSUPPORTED_FORMAT`. PDF JavaScript is never executed (the QuickJS engine is not even deployed) and pdf.js never fetches anything a PDF links to (`disableAutoFetch`, `disableStream`) |
| T4 | Resource exhaustion | A 500 MB upload on a phone, 20 MB of JSON, deeply nested JSON | Limits checked **before** reading (`checkLimits`), device-specific. Heavy work in workers with cancellation. JSON nesting > 2000 levels rejected before parsing. Large text only in the virtualized editor |
| T5 | Script injection (XSS) | User text rendered as HTML | React escapes all text. No `dangerouslySetInnerHTML` with user content; the only uses are the theme pre-paint script and JSON-LD, both built from constants/registry data and escaped (`serializeJsonLd`). User SVG/HTML is never rendered inline |
| T6 | Supply chain | A dependency adds tracking or a forbidden license | Exact pins + lockfile; license gate (`npm run licenses`); `npm audit --omit=dev` in CI; all libraries, fonts and WASM self-hosted (no CDN). The CSP also blocks any runtime script from another origin |
| T7 | Clickjacking / framing | Sprigkit embedded in a hostile page | `frame-ancestors 'none'`, `Cross-Origin-Opener-Policy: same-origin` |

Out of scope for the MVP: protection against a compromised device or browser extension (they can read any page), and against the hosting provider serving modified code (mitigated only by HTTPS and the public repository).

## 2. Content-Security-Policy

Served from `public/_headers` (Cloudflare Pages); full text in [architecture.md §11.1](architecture.md#111-content-security-policy-public_headers). The directives that carry the privacy promise:

| Directive | Value | Why |
|---|---|---|
| `connect-src` | `'self' blob: data:` | Scripts can only talk to our own origin. This is what makes "0 bytes uploaded" a guarantee and not a claim |
| `worker-src` | `'self' blob:` | Tool workers are bundled same-origin files |
| `script-src` | `'self' 'unsafe-inline' 'wasm-unsafe-eval'` | Inline scripts are required by static export (A-6); WASM for codecs and pdf.js decoders. No `unsafe-eval` |
| `img-src` | `'self' data: blob:` | Thumbnails are `blob:` URLs of the user's own files |
| `form-action` / `frame-src` / `object-src` | `'none'` | No forms submit anywhere; no embeds |

## 3. Data-handling rules (as implemented in Phase 3)

| Data | Where it lives | Lifetime |
|---|---|---|
| Files (merge-pdf) | `File` objects in React state; bytes read into `ArrayBuffer`s and **transferred** to the worker (not copied) | Until removed, "Start over", or the page closes. Thumbnail object URLs are revoked on removal and unmount |
| Merged output | `Blob` in memory | Until the list changes or the page closes; download URLs are revoked 10 s after the click |
| Text (json-formatter) | React state and the editor | Page lifetime only; never stored or put in the URL |
| Options (mode, indent, sort keys, JSONC) | `localStorage` `ts:v1:opts:<slug>` | Until cleared by the user |
| Theme | `localStorage` `ts:v1:theme` | Until cleared |

Errors shown to the user never contain file contents; technical details (shown behind "Details" for `E_UNKNOWN`) contain only the exception name and message.

## 4. Verification

| Check | Where |
|---|---|
| No cross-origin request during any E2E test, including tool runs | `e2e/fixtures.ts` (`noNetwork`, automatic), all of `e2e/tools/*.spec.ts` |
| CSP blocks a cross-origin `fetch` | `e2e/smoke.spec.ts` |
| No CSP violation or page error on any tested page | `e2e/fixtures.ts` (`csp`, automatic) |
| Options are stored, content is not | `e2e/tools/json-formatter.spec.ts` ("remembers options, never content"), `src/lib/shared.test.ts` |
| Content never in the URL | `e2e/tools/json-formatter.spec.ts` |
| Magic-byte detection beats file extensions | `src/lib/files/files.test.ts`, merge-pdf unit and E2E tests |
| Limits enforced before reading | `src/lib/files/files.test.ts`, json-formatter E2E (51 MB file refused) |

Limits of the automated checks (Playwright reports service-worker requests only in Chromium; worker-side CSP violations are not reported to the page) are listed in [testing-strategy.md §3](../05-quality/testing-strategy.md#3-e2e-tests-playwright).
