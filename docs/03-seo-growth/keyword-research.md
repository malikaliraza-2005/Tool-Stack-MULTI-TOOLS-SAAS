# Keyword Research

| | |
|---|---|
| **Last updated** | 2026-10-13 |
| **Phase** | P0 (P0-T05 – P0-T10, P0-T12) |
| **Related** | [mvp-scope.md](../01-product/mvp-scope.md) · [tool-registry.md](../04-architecture/tool-registry.md) · [competitor-research.md](../01-product/competitor-research.md) |

> **No invented metrics.** This document contains **no search volumes, keyword difficulty, CPC or traffic figures**. Every finding is either a qualitative observation or an ordering reported by a free source, with the source and date stated.

---

## 1. Sources and method

| Source | Status | What was collected |
|---|---|---|
| **Google autocomplete** (`suggestqueries.google.com`, `hl=en`, `gl=us`) | ✅ Collected 2026-10-13 | Suggestions for each candidate phrasing ("seeds"), for short prefixes ("probes", e.g. `jwt d`), and for long-tail modifiers (`how to …`, `… without uploading`, `… offline`, `is … safe`, `… on iphone`, `… free no sign up`, `… privacy`) |
| **Bing autosuggest** (`api.bing.com/osjson.aspx`, `market=en-US`) | ✅ Collected 2026-10-13 | Same queries as Google |
| **Competitor URL patterns** | ✅ Collected 2026-10-13 | Slugs used by iLovePDF, Smallpdf, PDF24, Sejda, Adobe, TinyWow, iLoveIMG, CodeBeautify and others; see [competitor-research.md](../01-product/competitor-research.md) |
| **Google Trends** | ❌ **Not collected** | The Trends API returned HTTP 429 to automated requests on 2026-10-13. **P0-T05 must be done by hand** in a browser (§5) |
| **"People also ask" / forum threads** | ⚠️ Partial | Google result pages could not be fetched automatically. Question-form autocomplete suggestions (`how to…`, `is … safe`, `can you…`) stand in as FAQ candidates (§3). Real PAA boxes should be checked by hand in Phase 8 |
| **Google Keyword Planner / Bing Webmaster keyword research** (optional, P0-T07) | ⏭ Skipped | Requires signed-in accounts; optional per the phase plan. If done later, record ranges exactly as shown |

**How to read autocomplete evidence.**
- The **order** of suggestions for a short prefix is a weak signal of relative popularity. Google does not document its ranking, and it also depends on freshness and personalization.
- A phrasing that appears as a completion of a short prefix on **both** engines is treated as an established query form.
- None of this measures volume.

**Limitations.** One locale (en-US), one day, no personalization control beyond a cookieless client. Re-collect before major copy decisions.

---

## 2. Findings that apply to every tool

1. **Privacy-intent queries exist for every tool.** Autocomplete returned these phrasings (Google or Bing, 2026-10-13):
   - **PDF:** "merge pdf without uploading", "split pdf without uploading", "jpg to pdf without uploading", "pdf to jpg without uploading", "how to merge multiple pdf locally on iphone"
   - **Image:** "heic to jpg without upload", "reduce image size without uploading", "resize image without uploading"
   - **Safety questions:** "is merge pdf safe", "is jpg to pdf converter safe", "is it safe to convert pdf to jpg online", "safest heic to jpg converter", "heic to jpg data safe", "is it safe to compress image online", "is it safe to sign documents online"
   - **Developer:** "decode jwt locally", "jwt decode offline", "is jwt decode safe", "json validator local", "json validator offline", "diff checker offline", "regex tester offline", "base64 decode offline", "url decode offline", "hash generator offline", "uuid generator offline"

   This supports the positioning in [product.md §4](../01-product/product.md#4-positioning). Every tool page should answer "is it safe / is it uploaded / does it work offline" directly.
2. **"Free", "no sign up" and "no limit" modifiers are everywhere** on file tools:
   - "merge pdf free no sign up", "split pdf no size limit", "heic to jpg free unlimited", "merge pdf without limit"
   - **Implication:** state plainly on the page that there are no accounts and no daily limits.
3. **Device modifiers dominate the long tail**: "on iphone", "on mac", "on windows", "on android".
   - Many are how-to queries for built-in OS features (e.g. "heic to jpg on iphone settings").
   - These are **guide** topics, not tool-page topics. Feed them to the Phase 8 content plan rather than tool pages.
4. **Brand navigation appears in autocomplete:**
   - "… i love pdf", "… adobe", "… sejda", "regex101", "jwt.io", "base64decode.org", "diffchecker.com"
   - Head terms remain owned by these brands (see [product.md §3](../01-product/product.md#3-market-observations)).
5. **Size targets are a strong long-tail cluster for image tools**:
   - Examples: "compress image to 100kb", "image compressor to 20kb", "resize image to kb", "compress image to 50kb offline"
   - The spec already has a target-size mode for `compress-image`. Mention concrete targets in content without creating a page per size: one intent per page, no programmatic variants.

---

## 3. Per-tool findings

Format for each tool:
- **Phrasings:** candidate phrasings, with what the short-prefix probes returned. "G" = Google, "B" = Bing, and the number is the 1-based position in the suggestion list.
- **Slug:** the decision.
- **FAQ candidates:** questions from autocomplete. They are not Google "People also ask" data.

### 3.1 PDF

**merge-pdf**
- **Phrasings:** `merge p` → "merge pdf" G1 B1. `combine p` → "combine pdf" G1 B1. "join pdf" only appears as its own seed.
- **Slug:** `merge-pdf` (universal across competitors). Put "combine" and "join" in the registry keywords.
- **FAQ candidates:**
  - Is it safe to merge PDFs online?
  - Can I merge PDFs without uploading them?
  - Can I merge PDFs offline?
  - How do I merge PDFs into one file for free without signing up?
  - Is there a limit on files or size?
  - Can I merge PDFs on iPhone?

**split-pdf**
- **Phrasings:** `split p` → "split pdf" G3 (behind non-PDF terms), B1. `extract pages` → "extract pages from pdf" G1 B1.
- **Slug:** `split-pdf`, with "extract pages" in the H1 and keywords. PDF24, Sejda and Smallpdf also run separate `extract-pdf-pages` pages. We keep one page because the job is the same; the spec covers both modes.
- **FAQ candidates:**
  - How do I split a PDF into separate pages?
  - How do I extract pages into a new PDF?
  - Can I split a PDF without uploading it?
  - Is there a size limit?
  - How do I split a PDF on iPhone?

**organize-pdf**
- **Phrasings:**
  - `organize p` → "organize pdf" G1 B1, "organize pdf pages" G2 B2.
  - `rearrange p` → "rearrange pdf pages" G1 B2.
  - `reorder p` → "reorder pdf pages" G1 B1.
  - The single tasks "delete pages from pdf" and "rotate pdf" are established queries in their own right.
- **Slug:** `organize-pdf` (iLovePDF, Smallpdf and Sejda all use it). The H1 and copy must name the jobs: rearrange, reorder, rotate, delete pages.
- **Watch:** "delete pages from pdf" and "rotate pdf" may deserve their own pages after launch. Decide from Search Console data, not now (scope rule).
- **FAQ candidates:**
  - How do I rearrange pages in a PDF?
  - How do I delete pages from a PDF?
  - Can I rotate a single page?
  - Can I organize a PDF without Adobe?
  - Is it free with no sign-up?

**jpg-to-pdf** (was `image-to-pdf`)
- **Phrasings:**
  - `jpg to` → "jpg to pdf" G1 B1.
  - `image to` → "image to pdf" G1 B2 (Bing: behind "image to text").
  - `photo to` → "photo to pdf" G1 B1.
  - "png to pdf" is also an established query.
  - The modifiers "combiner", "merge" and "multiple pages" appear for both "jpg to pdf" and "image to pdf".
- **Competitor slugs:**
  - `jpg-to-pdf`: Smallpdf, Sejda, Adobe; iLovePDF uses `jpg_to_pdf`.
  - `images-to-pdf`: PDF24.
  - `image-to-pdf`: only smaller sites.
- **Slug: `jpg-to-pdf`** **[Decision, see D-11]**. "JPG to PDF" is the phrasing the established sites converge on, and it is a top completion on both engines. The page accepts PNG, WebP and HEIC too. The H1 and copy say "JPG and other images to PDF". "image to pdf", "png to pdf" and "photo to pdf" go in the keywords.
- **Caveat:** without Trends we cannot confirm that "jpg to pdf" outranks "image to pdf" in interest. If the manual Trends check (§5) shows "image to pdf" clearly ahead, revisit **before the first production deploy**. After indexing, the slug is permanent.
- **FAQ candidates:**
  - Can I combine several JPGs into one PDF?
  - Does it work with PNG and iPhone photos?
  - Is it safe to convert JPG to PDF online?
  - Can I convert without uploading?
  - How do I convert JPG to PDF on iPhone?
  - Will the quality be reduced?

**pdf-to-jpg** (was `pdf-to-image`)
- **Phrasings:**
  - `pdf to j` → "pdf to jpg" G1 B1 (Bing also "pdf to jpeg" B2).
  - `pdf to i` → "pdf to image" G1 B1.
  - `pdf to p` → "pdf to png" G1 B1.
  - Safety questions appear: "is it safe to convert pdf to jpg online", "safe pdf to jpg converter".
- **Competitor slugs:** `pdf-to-jpg` at Smallpdf, Sejda and Adobe (iLovePDF `pdf_to_jpg`); `pdf-to-images` at PDF24.
- **Slug: `pdf-to-jpg`** **[Decision, see D-11]**. PNG output is an option on the same page. Same caveat as `jpg-to-pdf`.
- **FAQ candidates:**
  - Can I convert every page or only some pages?
  - Can I get PNG instead of JPG?
  - How do I get high quality (DPI)?
  - Is it safe?
  - Can I convert a password-protected PDF?
  - Can I do it on iPhone?

**sign-pdf**
- **Phrasings:**
  - `sign p` → "sign pdf" G1 B1.
  - `fill and s` → "fill and sign pdf" G1 B2.
  - `add signature` → "add signature to pdf" G1 B1.
  - "esign pdf" exists as a seed.
- **Slug:** `sign-pdf` (universal).
- **Content must not imply a certified digital signature.** Autocomplete shows demand for "sign pdf digitally" and "with dsc" / "with cac", which this tool does not do. The FAQ must say so plainly.
- **FAQ candidates:**
  - Is this a legally valid / digital signature?
  - How do I sign a PDF without Adobe?
  - Can I fill in form fields?
  - Is it safe to sign documents online?
  - How do I sign a PDF on iPhone?
  - Does it work offline?

### 3.2 Image

**compress-image**
- **Phrasings:**
  - `compress i` → "compress image" G1 B1.
  - `reduce image` → "reduce image size" G1 B1.
  - `image comp` → "image compressor" G1 B1.
- **Slug:** `compress-image`. Strong size-target cluster (see §2.5).
- **FAQ candidates:**
  - How do I compress an image to 100 KB (or another target size)?
  - Does compression reduce quality?
  - Can I compress without losing quality?
  - Is it safe to compress images online?
  - Can I compress many images at once?

**convert-image**
- **Phrasings:**
  - `heic to` → "heic to jpg" G1 B1.
  - `webp to` → "webp to png" G1, "webp to jpg" B1.
  - `convert im` → completions are almost all "convert image to pdf/jpg/png/svg/text": the generic query mixes many intents.
  - `image conv` → "image converter" G1 B1.
- **Slug:** `convert-image` stays.
- **HEIC note:** HEIC→JPG has very strong privacy-related autocomplete ("safest heic to jpg converter", "heic to jpg without upload", "heic to jpg data safe"). TinyWow, Picflow and CloudConvert all run dedicated HEIC pages. **Recommendation:** the `heic-to-jpg` preset page (Tier 2) is the first candidate to promote after launch, now that D-6 approves HEIC. This is not an MVP scope change.
- **FAQ candidates:**
  - How do I convert HEIC to JPG?
  - Is it safe to convert iPhone photos online?
  - What happens to transparency when converting PNG to JPG?
  - Which format is smallest: WebP, AVIF or JPG?
  - Can I convert many images at once?

**resize-image**
- **Phrasings:**
  - `resize i` → "resize image" G1 B1.
  - `image res` → "image resizer" G1 B1.
  - `crop im` → "crop image" G1 B1.
  - "resize image to kb" mixes resizing with file-size targets.
- **Slug:** `resize-image`. "Crop" goes in the H1 and keywords because the tool includes cropping.
- **FAQ candidates:**
  - How do I resize without losing quality?
  - How do I resize for Instagram without cropping?
  - Can I resize to exact pixels or a percentage?
  - How do I make a photo smaller in KB?
  - Can I resize many images at once?

**remove-exif-data**
- **Phrasings:**
  - `remove exif` → "remove exif data" G1 B2.
  - `remove metadata` → "remove metadata from photo" G1, but Bing leads with "remove metadata" and the PDF/Word variants.
  - `exif re` → "exif remover" G1 B2.
  - "remove location from photo" exists as a seed with iPhone/Android variants.
- **Slug:** `remove-exif-data`, the literal top query. Put "remove location / GPS from photo" in the H1 or tagline, and "remove metadata", "exif remover" and "strip exif" in the keywords.
- **FAQ candidates:**
  - What is EXIF data?
  - How do I check what EXIF data a photo has?
  - How do I remove location from a photo on iPhone or Android?
  - Does removing EXIF reduce quality? (Answer: no, stripping is lossless.)
  - Can I remove EXIF data offline?

### 3.3 Developer

**json-formatter**
- **Phrasings:**
  - `json f` → "json formatter" G1 B1.
  - `json v` → "json viewer" G1, "json validator" B1.
  - `json b` → "json beautifier" G1 B1.
- **Slug:** `json-formatter`. Title and H1 include "validator" and "viewer"; the tool does all three.
- **FAQ candidates:**
  - How do I validate JSON?
  - Can I validate against a JSON Schema? (Not in MVP: say so.)
  - Is my JSON sent anywhere?
  - Does it work offline?
  - How large a file can it handle?

**jwt-decoder**
- **Phrasings:**
  - `jwt d` → "jwt decode" G1, "jwt decoder" B1.
  - `decode j` → "decode jwt" G1 B1.
  - Strong local and privacy intent: "decode jwt locally", "decode jwt token locally", "jwt decode offline", "is jwt decode safe".
- **Slug:** `jwt-decoder` (kept). Both forms are established; "decoder" is the noun that describes the tool.
- **FAQ candidates:**
  - Is it safe to paste a JWT here?
  - Can a JWT be decoded without the secret?
  - How do I verify the signature?
  - How do I check if a token is expired?
  - What is the difference between decoding and verifying?

**base64-encode-decode** (was `base64-encoder-decoder`)
- **Phrasings:**
  - `base64` → "base64 decode" G1 B1, "base64 encode" G3 B2.
  - `base64 d` → "base64 decode" G1 B1.
  - `base64 e` → "base64 encode" G1 B1, then "base64 encode decode" (G4 B3).
  - The noun forms ("base64 decoder" / "base64 encoder") appear only as their own seeds.
  - "base64 to image" is a strong related query and is covered by file mode.
- **Slug: `base64-encode-decode`** **[Decision, see D-11]**. It matches the verb forms people type and the combined phrasing autocomplete offers. One page, because encode and decode are one job with a direction toggle.
- **FAQ candidates:**
  - How do I decode Base64 to an image or file?
  - What is URL-safe Base64?
  - Is Base64 encryption? (No.)
  - Can I decode Base64 offline?
  - Why does my decoded text look garbled? (Character encoding.)

**url-encode-decode** (was `url-encoder-decoder`)
- **Phrasings:**
  - `url d` → "url decoder" G1 B1.
  - `url e` → "url encoder" G1, "url encode" B1.
  - `url enc` → "url encoder" G1, "url encode" B1, then "url encode decode" (G2 B3).
  - Mixed noun and verb usage.
  - "url parser" is weaker and mostly language-specific ("python", "js").
- **Slug: `url-encode-decode`** **[Decision, see D-11]**. The verb form matches `base64-encode-decode`, so slugs stay consistent, and autocomplete offers "url encode decode" on both engines. The URL parser stays a mode on this page and is mentioned in the title.
- **FAQ candidates:**
  - How do I URL-encode a space (`%20` or `+`)?
  - What characters need encoding?
  - What is the difference between `encodeURI` and `encodeURIComponent`?
  - How do I decode a Safe Links or Proofpoint URL? (Appears in autocomplete. Answer honestly: decoding shows the target; we do not unwrap vendor formats in MVP.)

**diff-checker**
- **Phrasings:**
  - `diff c` → "diff checker" G1 B1.
  - `text com` → "text compare" G1 B1.
  - `compare t` → "compare text" (G2, B3) behind "compare two lists".
- **Slug:** `diff-checker` (kept). "Compare text" goes in the title and keywords.
- **FAQ candidates:**
  - How do I compare two files?
  - Can I ignore whitespace?
  - Is my text uploaded?
  - Does it work offline?
  - Can I see word-level differences? (Free here; a Pro feature at Diffchecker.)

**regex-tester**
- **Phrasings:**
  - `regex t` → "regex tester" G1 B1.
  - `regex` → brand navigation dominates ("regex101", "regexr").
  - `regular expression t` → "regular expression tester" G1 B1.
  - Language modifiers are common: python, javascript, c#, java.
- **Slug:** `regex-tester` (kept). The page must state which flavor it uses (JavaScript). Language-specific queries are partly unservable; be explicit about it.
- **FAQ candidates:**
  - Which regex flavor does this use?
  - Why does my regex work here but not in Python?
  - What do the flags mean?
  - Why did my regex time out? (Catastrophic backtracking.)
  - Does it work offline?

**unix-timestamp-converter**
- **Phrasings:**
  - `unix t` → "unix timestamp" G1 B1, "unix timestamp converter" G2.
  - `epoch c` → "epoch converter" G1 B1.
  - `timestamp c` → "timestamp converter" G1 B1.
  - "Discord timestamp" is a distinct intent (Discord's `<t:…>` format) that appears for every phrasing. Not in MVP scope; note it as a Tier 2 idea.
- **Slug:** `unix-timestamp-converter` (kept). "Epoch converter" goes in the title and H1.
- **FAQ candidates:**
  - What is the current Unix timestamp?
  - Seconds or milliseconds: how can I tell?
  - How do I convert a timestamp to my time zone?
  - How do I convert a date to a Unix timestamp?
  - What is the year 2038 problem?

**uuid-generator**
- **Phrasings:**
  - `uuid g` → "uuid generator" G1 B1.
  - `guid g` → "guid generator" G1 B1.
  - Version modifiers are common: "uuid generator v4", "v7".
  - "ulid generator" exists but is niche.
- **Slug:** `uuid-generator` (kept). "GUID" goes in the title and keywords.
- **FAQ candidates:**
  - What is the difference between UUID v4 and v7?
  - Is a GUID the same as a UUID?
  - Are generated UUIDs truly random / unique?
  - Can I generate UUIDs in bulk or without dashes?
  - What is a ULID?

**hash-generator**
- **Phrasings:**
  - `hash g` → "hash generator" B1, but G1 is non-technical (food and places).
  - `sha256` → "sha256 hash" G2, "sha256 hash generator" B2.
  - `md5` → "md5 hash" G3 B2.
  - `checksum` → "checksum calculator" G4.
- **Slug:** `hash-generator` (kept). Title: "Hash Generator: SHA-256, MD5, SHA-1, SHA-512". Algorithm-specific landing pages are a post-launch option, not MVP.
- **FAQ candidates:**
  - How do I verify a file checksum?
  - Can a SHA-256 hash be decrypted? (No; autocomplete shows "sha256 decrypt" and "md5 decrypt" demand, so explain why.)
  - Is MD5 secure?
  - What is HMAC?
  - Are my files uploaded?

---

## 4. Final slugs and weak-demand review

### 4.1 Final slugs

**[Decision 2026-10-13, D-11]** (P0-T09)

| # | Slug | Changed? |
|---|---|---|
| 1 | `merge-pdf` | |
| 2 | `split-pdf` | |
| 3 | `organize-pdf` | |
| 4 | `jpg-to-pdf` | was `image-to-pdf` |
| 5 | `pdf-to-jpg` | was `pdf-to-image` |
| 6 | `sign-pdf` | |
| 7 | `compress-image` | |
| 8 | `convert-image` | |
| 9 | `resize-image` | |
| 10 | `remove-exif-data` | |
| 11 | `json-formatter` | |
| 12 | `jwt-decoder` | |
| 13 | `base64-encode-decode` | was `base64-encoder-decoder` |
| 14 | `url-encode-decode` | was `url-encoder-decoder` |
| 15 | `diff-checker` | |
| 16 | `regex-tester` | |
| 17 | `unix-timestamp-converter` | |
| 18 | `uuid-generator` | |
| 19 | `hash-generator` | |

Applied to [mvp-scope.md](../01-product/mvp-scope.md), [tool-registry.md](../04-architecture/tool-registry.md), [tool-specifications.md](../04-architecture/tool-specifications.md), the roadmap and the phase files.

### 4.2 Weak-demand review (P0-T10)

**No tool is flagged as clearly weak, and no Tier 2 swap is proposed.** Every primary phrasing appears as a top completion of its short prefix on at least one engine, and on both engines for 18 of 19. The exception is "hash generator", which is B1 only.

Without Trends or Keyword Planner data the tools cannot be ranked against each other, so this is a weak-evidence "no". Lowest-confidence tools, to watch in Search Console after launch:

| Tool | Why it's on the watch list |
|---|---|
| `hash-generator` | The generic phrasing is ambiguous on Google. Demand is split across algorithm-specific queries |
| `uuid-generator` | Small, commodity intent; strong incumbents |
| `organize-pdf` | The umbrella term may be weaker than its sub-tasks ("delete pages from pdf", "rotate pdf") |

---

## 5. Manual follow-up (Google Trends, P0-T05)

Do this in a normal browser at https://trends.google.com/trends/explore. Use worldwide and the past 12 months, then repeat for the US. Record only the **relative ordering** and the date in this table; do not record index numbers as if they were volumes.

| Comparison | Decides |
|---|---|
| jpg to pdf · image to pdf · png to pdf · photo to pdf | Confirms or revisits `jpg-to-pdf` |
| pdf to jpg · pdf to image · pdf to png | Confirms or revisits `pdf-to-jpg` |
| base64 decode · base64 encode · base64 decoder · base64 encoder | Confirms `base64-encode-decode` |
| url decode · url encode · url decoder · url encoder | Confirms `url-encode-decode` |
| jwt decoder · jwt decode · decode jwt | Confirms `jwt-decoder` |
| unix timestamp converter · epoch converter · timestamp converter | Confirms `unix-timestamp-converter` |
| organize pdf · rearrange pdf pages · delete pages from pdf · rotate pdf | Post-launch page candidates |
| heic to jpg · merge pdf · json formatter · remove exif data · hash generator | Rough cross-pillar ordering for the watch list |

Any revisit must happen **before the first production deploy**. After that, slugs are permanent (see D-11).

| Comparison | Ordering found | Date | By |
|---|---|---|---|
| | | | |
