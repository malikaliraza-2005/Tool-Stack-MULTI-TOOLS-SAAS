# Competitor Research

| | |
|---|---|
| **Last updated** | 2026-10-13 |
| **Phase** | P0 (P0-T08, P0-T13) |
| **Related** | [product.md](product.md) · [mvp-scope.md](mvp-scope.md) · [keyword-research.md](../03-seo-growth/keyword-research.md) |

> **Evidence labels.** **[Verified 2026-10-13]** = read on the competitor's own page on that date. **[Secondary]** = from a search snippet, review site, or third-party article; not confirmed on the vendor's page. **[Unverified]** = prior knowledge, not checked. No traffic, ranking-position, or revenue figures are given; none were available from reliable free sources.
>
> **Search-result caveat.** "Who appears for a query" below comes from a generic web-search tool, not from Google. It shows which kinds of pages compete in the long tail; it is **not** a Google ranking. Re-check the real Google results by hand (private window, US locale) before writing page copy in Phase 8.

---

## 1. Summary

1. **Every major PDF and image brand processes files on its servers.** All of these say so on their own pages **[Verified 2026-10-13]**: iLovePDF, Smallpdf, PDF24 (online tools), Sejda (web), Adobe Acrobat online, TinyPNG, iLoveIMG and TinyWow. Retention is stated as 1 h (Smallpdf, PDF24, TinyWow), 2 h (iLovePDF, Sejda) and up to 48 h (TinyPNG). Our "nothing is uploaded" position holds against every head-term leader.
2. **"No upload" is no longer unique on its own.** A wave of small sites now claims client-side PDF and image processing (BentoPDF, CoolPDF, ZeroUploadPDF, PDFYogi, Docexp, Picflow and several EXIF removers) **[Secondary]**. The defensible angle is **no-upload *plus* provable *plus* premium**:
   - CSP-enforced, so it can be checked in DevTools.
   - Works offline after load.
   - Lossless where competitors re-encode.
   - Designed to a standard none of these sites reach.
3. **In developer tools, privacy is table stakes.** jwt.io, regex101, jsonformatter.org, Diffchecker and CyberChef already run in the browser **[Verified / Secondary, per row in §4]**. We compete there on speed, design, keyboard flow and trustworthy proof, not on privacy alone.
4. **Free-tier friction at the leaders is real and documented** (§5). "No limits, no sign-up, no ads in the tool" is a concrete, honest differentiator.
5. **Gaps at the big brands:**
   - A dedicated, **lossless** EXIF/location remover. iLoveIMG and TinyWow have no EXIF tool at all **[Verified 2026-10-13]**.
   - A dedicated HEIC→JPG page. iLoveIMG only accepts HEIC as an input to "Convert to JPG" **[Verified 2026-10-13]**.

---

## 2. PDF pillar

| Competitor | Processing | Strengths | Weaknesses | Slug pattern |
|---|---|---|---|---|
| **iLovePDF** | **Server.** FAQ: files kept "for a maximum of 2 hours" ([faq](https://www.ilovepdf.com/help/faq)) **[Verified]** | Largest PDF toolset, strong brand, cloud-drive import, desktop apps | Free tier: "limited document processing" with ads. Per-tool free caps **[Verified]** ([pricing](https://www.ilovepdf.com/pricing)), e.g. Merge 100 MB/25 files, PDF→JPG 25 MB/2 files, Sign 50 MB/3 | Legacy underscores (`/merge_pdf`, `/jpg_to_pdf`, `/pdf_to_jpg`); newer pages hyphenated (`/organize-pdf`, `/sign-pdf`) |
| **Smallpdf** | **Server.** "cloud-based… deleted from our servers after one hour" ([merge-pdf](https://smallpdf.com/merge-pdf)) **[Verified]** | Polished design; no sign-up to merge/sign | Free plan widely reported as about 2 tasks/day **[Secondary]** (official pricing page did not render); constant Pro/trial upsell | `/merge-pdf`, `/split-pdf`, `/organize-pdf`, `/jpg-to-pdf`, `/pdf-to-jpg`, `/sign-pdf` |
| **PDF24** | **Server** for online tools; deleted after 1 h ([tools.pdf24.org](https://tools.pdf24.org/en/)) **[Verified]**. Desktop app is local | Free, "no artificial limits", no registration **[Verified]** | Ad-funded **[Verified]**; utilitarian design **[Unverified]** | `/en/images-to-pdf`, `/en/pdf-to-images`, `/en/rearrange-pdf-pages` |
| **Sejda** | **Server** (web); deleted after 2 h. Desktop is local ([pricing](https://www.sejda.com/pricing)) **[Verified]** | Deep features (split by outline/size/text) | Tightest free limits: 50 pages or 50 MB, **3 tasks per hour** **[Verified]** | `/merge-pdf`, `/organize-pdf`, `/jpg-to-pdf`, `/pdf-to-jpg` |
| **Adobe Acrobat online** | **Server.** "handled by Adobe servers and deleted unless you sign in" ([merge](https://www.adobe.com/acrobat/online/merge-pdf.html)) **[Verified]** | Brand trust; generous merge limits | Sign-in for follow-on actions **[Verified]**; heavy upsell; many localized duplicate pages | `/acrobat/online/merge-pdf.html`, `rearrange-pdf`, `jpg-to-pdf`, `pdf-to-jpg`, `sign-pdf` |
| **TinyWow** | **Server**; deleted after 1 h ([tinywow.com](https://tinywow.com/)) **[Verified]** | "No limits, no sign-up" messaging; broad catalog | Premium sold as "without limits, ads, or roadblocks" **[Verified]** | Nested: `/pdf/merge`, `/pdf/from-jpg`, `/image/heic-to-jpg` |
| **123apps / pdf.io** | Server **[Unverified]** | Very large suite | Premium sells "no ads" **[Verified]** | `/jpg2pdf/`, `/pdf2jpg/` |
| **Stirling-PDF** | Self-hosted server ([GitHub](https://github.com/Stirling-Tools/Stirling-PDF)) **[Verified]** | Huge feature set; open core | Not a public no-install website; paid enterprise tier | n/a |

**Client-side PDF sites** (direct threats to the privacy angle):
- **BentoPDF** and **CoolPDF**: both **AGPL-3.0** **[Secondary]**, so their code is off-limits to us under rule 3. BentoPDF loads AGPL WASM (Ghostscript, PyMuPDF) from a CDN **[Secondary]**, which our CSP model forbids.
- **ZeroUploadPDF, PDFYogi, Docexp, PDFSeal**: small sites; quality and design unverified **[Secondary]**.

**Our angle (PDF):** the only polished, permissively licensed PDF suite where the no-upload claim is enforced by CSP and works offline. Copy should say *how to verify* (Network tab), not only "we don't upload".

---

## 3. Image pillar

| Competitor | Processing | Strengths | Weaknesses | Slug pattern |
|---|---|---|---|---|
| **Squoosh** (Google) | **Local** ([GitHub](https://github.com/GoogleChromeLabs/squoosh)) **[Verified]** | Best codecs, before/after slider, Apache-2.0 | Last commit on `dev` 2024-08-19 **[Verified]**: effectively unmaintained. One image at a time; no HEIC, no EXIF tool **[Unverified]** | Single app |
| **TinyPNG** | Server, inferred: images kept up to 48 h ([tinypng.com](https://tinypng.com/)) **[Verified]** | Strong compression brand; modern formats | Free: 20 images × **5 MB** each **[Verified]** | Root domain only |
| **iLoveIMG** | **Server** ([faq](https://www.iloveimg.com/help/faq)) **[Verified]** | Clean UI, brand family of iLovePDF | **No EXIF tool, no dedicated HEIC tool** **[Verified]** | `/compress-image`, `/resize-image`, `/crop-image`, `/convert-to-jpg` |
| **CloudConvert** | Server **[Unverified]** | Huge format matrix | Free: **10 conversions/day** ([pricing](https://cloudconvert.com/pricing)) **[Verified]** | `/{from}-to-{to}` e.g. `/heic-to-jpg` **[Unverified]** |
| **Convertio** | Server **[Unverified]** | Wide formats | Free limits not stated on pricing page **[Verified]** | `/{from}-{to}/` **[Unverified]** |
| **Img2Go** | Server; compression forces JPG output **[Secondary]** | | Output format forced | `/compress-image` |

**Client-side image sites** **[Secondary]**:
- **HEIC:** Picflow `/convert/heic-to-jpg` is client-side. Tuxxin's HEIC converter states it processes on its server.
- **EXIF:** codeshack, Upsampler, imageonline.io, Compresto and pixconvert offer local removers. A documented weakness of canvas-based removers: **they silently re-encode the image and lose quality** ([upsampler](https://upsampler.com/blog/remove-exif-metadata-from-photos-online-free)).

**Our angle (image):**
- Maintained, batch-capable, Squoosh-grade codecs with a premium UI.
- **Lossless** EXIF/GPS stripping at byte level (spec §4.4), shown with a clear before/after of what was removed.
- A dedicated HEIC page if D-6 allows it.

---

## 4. Developer pillar

| Competitor | Processing | Strengths | Weaknesses | Slug pattern |
|---|---|---|---|---|
| **jwt.io** | Client-side **[Secondary]** | Canonical brand; decode/verify/encode | Vendor (Auth0/Okta) marketing focus **[Unverified]** | `/` |
| **regex101** | **Client-side** for all engines ([privacy](https://docs.regex101.com/application/privacy/)) **[Verified]**; saving uploads the pattern | 10 flavors, explanations, unit tests | Carbon/BuySellAds ads **[Verified]**. Very hard to beat on features: compete on UX, not breadth | `/`, `/r/{id}` |
| **jsonformatter.org** | Client-side validation **[Verified]** | Many JSON sub-tools | Ads; **saving without login makes data public** **[Verified]** | `/json-parser`, `/json-pretty-print` |
| **CodeBeautify** | Not stated **[Verified]** | Hundreds of tools | Cluttered **[Unverified]**; ads | `/jwt-decode`, `/base64-encode` + `/base64-decode`, `/unix-time-stamp-converter` |
| **Diffchecker** | Client-side ("runs in your browser") **[Verified]** | Text/image/PDF/Excel compare | Word/character diff, syntax highlighting, real-time editing gated to Pro **[Verified]** | `/`, `/image-compare/` |
| **epochconverter.com** | Not stated | Seconds through nanoseconds; many date utilities **[Verified]** | Units must be selected manually, not auto-detected **[Verified]** | `/`, `/batch` |
| **uuidgenerator.net** | Not stated | v1/v4/v7/GUID | Ad-supported **[Verified]** | `/version4`, `/version7`, `/guid` |
| **it-tools** | Client-side **[Unverified]** | About 86 tools, good design | **GPL-3.0**: ideas only, never code **[Verified]** | `jwt-parser`, `base64-string-converter`, `url-encoder` |
| **CyberChef** | Client-side ([GitHub](https://github.com/gchq/CyberChef)) **[Verified]** | Extremely powerful; Apache-2.0 | Expert "recipe" UX; slow for one-off tasks **[Unverified]** | Single app |
| **DevToys** | Desktop app (MIT) **[Verified]** | 30 tools offline | Requires install; not a search competitor | n/a |

**Our angle (developer):**
- One fast, keyboard-first Workbench across all nine tools, with smart paste.
- No ads near the editor.
- Features competitors gate or omit: word/char diff free (Diffchecker gates it), auto-detected timestamp units (epochconverter does not), and JWT signature verification with the key never leaving the page.

---

## 5. Documented free-tier friction (all [Verified 2026-10-13] unless marked)

| Site | Friction |
|---|---|
| Sejda | 3 tasks per hour; 50 pages or 50 MB |
| CloudConvert | 10 conversions per day |
| TinyPNG | 5 MB per image, 20 per batch |
| iLovePDF | Per-tool file-size and file-count caps; ads on free tier |
| Smallpdf | About 2 tasks per day **[Secondary]** |
| Diffchecker | Word/char diff and syntax highlighting on Pro |
| jsonformatter.org | Anonymous saves are public |

---

## 6. Implications for Sprigkit

| Finding | Action | Where |
|---|---|---|
| Leaders upload; small sites now also claim no-upload | Make the claim **verifiable**: CSP, offline mode, a "how to check" section on every file-tool page | G-4, G-9 in [mvp-scope.md](mvp-scope.md) |
| Canvas EXIF removers lose quality | Lossless byte-level stripping is the headline for `remove-exif-data` | [tool-specifications.md §4.4](../04-architecture/tool-specifications.md) |
| HEIC has dedicated pages at TinyWow, Picflow, CloudConvert; not at iLoveIMG | Ship HEIC (D-6) and evaluate the `heic-to-jpg` preset page after launch | [risks-and-decisions.md](../06-delivery/risks-and-decisions.md) D-6 |
| Free-tier caps are a top complaint | Say plainly: no daily limits, no sign-up, limits only from the user's device | Page copy (Phase 8) |
| AGPL/GPL competitors (BentoPDF, CoolPDF, it-tools) | Never copy code; ideas only | [dependencies-licenses.md §5](../04-architecture/dependencies-licenses.md) |
| Squoosh is unmaintained | An opening for a maintained, local, batch image compressor | Positioning |

---

## 7. Not verified (re-check before relying on it)

- Real Google rankings for every query.
- Smallpdf's official free limits (pricing page did not render).
- Convertio's free limits (FAQ returned 404).
- base64decode.org and urldecoder.org processing and ads (403 to automated fetch).
- jwt.io's client-side claim (search snippet only).
- it-tools' live route names.
