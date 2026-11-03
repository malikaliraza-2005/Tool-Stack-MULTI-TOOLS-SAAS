# Terms of Use

| | |
|---|---|
| **Last updated** | 2026-11-02 (Phase 8, P8-T08) |
| **Status** | Live at `/terms` ([src/app/terms/page.tsx](../../src/app/terms/page.tsx)) |
| **Related** | [privacy-policy.md](privacy-policy.md) · [tool-specifications.md §3.6](../04-architecture/tool-specifications.md) (Sign PDF) · [dependencies-licenses.md](../04-architecture/dependencies-licenses.md) |

**The page is the terms text.** This document records the decisions behind it. When either changes, update both in the same commit and change `updated` on the page.

Not legal advice: plain terms matching actual behaviour, checked against the usual structure of free-tool terms (acceptance, acceptable use, user content, disclaimer, liability, changes, governing law). A review by a lawyer is advisable before monetization.

---

## 1. Decisions

| Section | Decision | Why |
|---|---|---|
| Using Ondevo | Operator named: Ali Raza | Owner decision 2026-11-02; the same name is on About and Privacy |
| Using Ondevo | Acceptable use limited to two rules (nothing unlawful, don't attack the site) | The service has no accounts or user-generated public content, so longer lists add nothing enforceable |
| Your files | User keeps all rights; we never receive files | Local processing (privacy-policy.md §1). Originals are never modified: browsers can't write to a selected file |
| Signatures | "Visual signature, not a certified digital signature" stated plainly | Phase 8 task text and keyword-research §3.1: demand exists for certified signing ("with dsc", "cac"), which sign-pdf doesn't do. Same wording as the sign-pdf FAQ |
| Results | Users check results that matter | Tools can fail on unusual or damaged files; each tool page states its limits |
| Open source | Terms don't limit open-source licenses | Required in spirit by LGPL-3.0 for libheif (D-6); `/licenses` |
| No warranty | "As is" and "as available" | Phase 8 task text; free service |
| Liability | No indirect or consequential loss; cap equals what the user paid (nothing); mandatory liability not excluded | Free service; the carve-out keeps the clause from overreaching where the law forbids exclusions |
| Governing law | Laws and courts of Pakistan; mandatory consumer protections of the user's country preserved | Owner decision 2026-11-02 (the operator's country). The consumer-law sentence avoids claiming to remove rights that can't be waived |
| Contact | officialaliraza2005@gmail.com | `CONTACT_EMAIL` in `src/config/site.ts` |

## 2. Must change when…

| Change | Update |
|---|---|
| Paid plans, ads or accounts | Using Ondevo, liability cap, privacy policy; consider a lawyer review |
| A tool that produces certified signatures | Signatures section |
| The operator becomes a company | Every "Ali Raza" reference on Terms, Privacy and About |
