# Privacy Policy

| | |
|---|---|
| **Last updated** | 2026-11-02 (Phase 8, P8-T07) |
| **Status** | Live at `/privacy` ([src/app/privacy/page.tsx](../../src/app/privacy/page.tsx)) |
| **Related** | [security-privacy.md](../04-architecture/security-privacy.md) · [architecture.md §9–11](../04-architecture/architecture.md#9-state-and-storage) · [terms-of-use.md](terms-of-use.md) · [content-voice-ux-copy.md](../02-design/content-voice-ux-copy.md) |

**The page is the policy text.** This document records the fact behind every statement on it, so a change in the code that breaks a statement is caught. When either changes, update both in the same commit and change `updated` on the page.

Not legal advice: written as a plain, honest description of actual behaviour (phase-08 risk fallback). A review by a lawyer is advisable before monetization or analytics are added.

---

## 1. Statements and evidence

| Section | Statement | Evidence |
|---|---|---|
| Summary, Your files | Files and text are processed in the browser and never sent anywhere | No backend (static export, CLAUDE.md rule 1). CSP `connect-src 'self' blob: data:` in `public/_headers`. E2E `noNetwork` fixture fails any test with a cross-origin request (`e2e/fixtures.ts`) |
| Your files | Content never in the address bar, gone on close, reload or removal | security-privacy §3; json-formatter E2E checks the URL. Inputs live in React state only |
| Your files | Downloads are created on the device | Results are `Blob`s with object URLs (security-privacy §3) |
| Summary | No accounts | No auth exists (CLAUDE.md rule 1) |
| Storage | Keys start with `ts:v1:`: theme, tool options, favorites, recent tools | `src/lib/storage.ts` (`ts:v1:` prefix, schema-validated, ≤ 2 KB), `src/lib/theme.ts`, `src/lib/tool-prefs.ts` (`favorites`, `recent`), `useToolOptions` (`opts:<slug>`) |
| Storage | Saved signature only after opting in; deleted with "Delete" or by clearing site data | `src/tools/sign-pdf/signature.ts` (`ts:v1:sign-pdf:signature`, PNG data URL); checkbox "Remember my signature on this device" and "Delete" button in `SignatureDialog.tsx`. The one exception to rule 4 (tool-specifications §3.6) |
| Storage | Offline copy of the site's own files, no user content | Serwist precache and runtime caches (`src/sw.ts`, architecture §10): pages, shell, fonts, on-intent libraries and WASM |
| Hosting | Cloudflare Pages receives standard request data (IP, URL, user agent, time) | deployment.md (Cloudflare Pages). Wording kept general; links Cloudflare's own policy |
| Hosting | Cloudflare can see which files load (e.g. the PDF engine), not content | Engines load on intent from the same origin (architecture §8); content never leaves the page |
| Analytics, cookies, ads | None | No analytics script; CSP would block a third-party one (`script-src 'self'`). No `document.cookie` writes in `src/`. Cloudflare Web Analytics stays off until P9-T19 (deployment.md, step 6) |
| Verify | Network tab shows only same-origin requests; tools work offline | CSP; `e2e/pwa.spec.ts` (offline per category) |
| Contact | Run by Ali Raza; officialaliraza2005@gmail.com | Owner decision 2026-11-02; `CONTACT_EMAIL` in `src/config/site.ts` |

## 2. Must change when…

| Change | Update |
|---|---|
| Analytics enabled (P9-T19, P10-T03) | "Analytics, cookies and ads": name the provider, what it receives, and whether it sets cookies; Summary bullet; date. Publish **before** enabling (the page promises this) |
| A new `localStorage` key or other browser storage | "What is stored in your browser" |
| Hosting moves away from Cloudflare Pages | "Hosting" and the Summary |
| Ads or a paid plan (monetization) | Summary, "Analytics, cookies and ads", About page |
| Any tool contacts another origin | Not allowed (rule 2); if ever allowed, it needs its own disclosure |
