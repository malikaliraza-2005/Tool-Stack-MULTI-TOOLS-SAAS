# Page SEO Specs

| | |
|---|---|
| **Last updated** | 2026-11-02 (Phase 8, P8-T01) |
| **Status** | Spec for every indexable page. Tool and hub copy reviewed against keyword research; the P8-T02 changes are applied |
| **Related** | [seo-strategy.md](seo-strategy.md) · [keyword-research.md](keyword-research.md) · [content-voice-ux-copy.md](../02-design/content-voice-ux-copy.md) · [tool-registry.md](../04-architecture/tool-registry.md) |

What each page targets, what it is called, what it must answer, and which structured data it carries.

**Source of truth.** For tool pages and hubs, the copy lives in code: `src/tools/<slug>/meta.ts` (title, description, H1, FAQs, related) and `content.tsx` (H2 sections), and `src/tools/hubs.ts`. This document records the target and the review. When the two disagree, the code is what ships; fix whichever is wrong and update the other in the same change. The tool tables in §5 were generated from the registry on 2026-11-02.

---

## 1. Rules for every page

| Element | Rule | Enforced by |
|---|---|---|
| Title | ≤ 65 characters, unique across the site, primary query first, ends with "\| KeptLocal" (tools, hubs, home, guides) or "· KeptLocal" (site pages; About is "About KeptLocal") | `src/tools/validate.ts`, `hubs.test.ts` |
| Meta description | 70–160 characters, unique, says what the page does and that nothing is uploaded where that applies | same |
| H1 | One per page, unique, sentence case | same (tools) |
| Canonical | `SITE_URL` + path, no trailing slash | `toolMetadata`, `hubMetadata`, per-page `alternates` |
| H2s | Describe the user's task, not keywords; no boilerplate repeated across pages except the shared privacy section | review (P8-T04) |
| FAQs | From keyword-research §3 (autocomplete questions; real "People also ask" boxes still to check by hand). Visible on the page; FAQPage JSON-LD only mirrors visible FAQs. Live tools have ≥ 3 | `validate.ts`, `e2e/seo.spec.ts` |
| Claims | Only what the code does (content-voice §1). No "100% secure", no "no limits" (there are size limits), no "collects nothing" (the host sees request data) | review |
| Indexing | Every page in §3 is in the sitemap; `/_gallery` and 404 are `noindex` and not listed | `sitemap.ts`, page metadata |

## 2. Shared requirements for tool pages

Keyword research §2 found privacy, cost and offline questions for every tool. Each tool page must answer them, once, without repeating the same paragraph as an FAQ on all 19 pages:

1. **Is it uploaded / is it safe?** The shared "How your data stays private" section (`ToolPage`), plus one tool-specific FAQ in the tool's own words (e.g. "Is my PDF or signature uploaded?").
2. **Is it free, is there an account?** One line in the shared section.
3. **Does it work offline?** One line in the shared section, matching the PWA as built: pages work offline after the first visit; file tools after their first use.
4. **Limits:** the tool's real numbers in "Formats and limits" (from `limits` in the registry).

**Changed (P8-T02):** the shared section answered (1) only; (2) and (3) are now a closing paragraph, in the homepage FAQ's wording ("no account, no sign-up and no watermark"; pages offline after the first visit, a tool's larger parts saved on first use).

## 3. Page inventory

| URL | Type | Title | Schema | Phase |
|---|---|---|---|---|
| `/` | Home | see §4.1 | WebSite · Organization · FAQPage | P7, metadata P8-T02 |
| `/pdf-tools`, `/image-tools`, `/developer-tools` | Hub | see §4.2 | BreadcrumbList · CollectionPage + ItemList | P7, content P8-T05 |
| `/<slug>` × 19 | Tool | see §5 | BreadcrumbList · WebApplication · FAQPage | P3–P6 |
| `/about` | Site page | About KeptLocal | BreadcrumbList · AboutPage | P8-T06 |
| `/privacy` | Site page | Privacy policy · KeptLocal | BreadcrumbList · WebPage | P8-T07 |
| `/terms` | Site page | Terms of use · KeptLocal | BreadcrumbList · WebPage | P8-T08 |
| `/licenses` | Site page | Open-source licenses · KeptLocal | BreadcrumbList · WebPage | P6 (early), P8-T09 |
| `/llms.txt` | Text | (none) | none | P8-T15 |
| `/guides` | Guide index | see §4.4 | BreadcrumbList · CollectionPage + ItemList | P8-T11 |
| `/guides/<slug>` | Guide | see §4.4 | BreadcrumbList · Article | P8-T12 |
| 404 | Error | Page not found | none, `noindex` | P2 |

## 4. Non-tool pages

### 4.1 Homepage `/`

| Field | Spec |
|---|---|
| Primary query | Brand ("keptlocal"), then "private pdf tools", "online tools without uploading" (keyword-research §2.1) |
| Title (60) | KeptLocal: Private PDF, Image and Developer Tools, No Upload |
| Description (137) | Free online PDF, image and developer tools that run in your browser. Files and text never leave your device. No sign-up, no daily limits. |
| H1 | Private tools for PDFs, images and code (as built) |
| H2 outline | Privacy proof strip · Popular tools · All tools (the index, by category) · Frequently asked questions (as built, ui-ux-specification §3) |
| FAQs | The five homepage FAQs in `src/app/page.tsx` (uploads, what to drop or paste, free, offline, browsers) |
| Schema | `WebSite` (name, url) · `Organization` (name, url, logo, contact email from `src/config/site.ts`) · `FAQPage` mirroring the visible FAQs |
| Related | Every published tool (the index), the three hubs |

**Changed (P8-T02):** the homepage inherited the layout's default title ("KeptLocal") and description, and had no JSON-LD although it shows FAQs. Added: page metadata (title as `absolute`, description, canonical, Open Graph) and the JSON-LD above. No `SearchAction`: the site has no search results URL.

### 4.2 Category hubs

Copy in `src/tools/hubs.ts`; tool lists from the registry.

| URL | Primary query | Title | Description | H1 |
|---|---|---|---|---|
| `/pdf-tools` | pdf tools (not researched in P0) | Free PDF Tools Online: Private, No Upload \| KeptLocal (52) | Merge, split, organize, sign and convert PDF files in your browser. Files stay on your device and are never uploaded. Free, no sign-up. (135) | PDF tools |
| `/image-tools` | image tools (not researched in P0) | Free Image Tools Online: Private, No Upload \| KeptLocal (54) | Compress, convert, resize and clean images in your browser, including HEIC photos from iPhones. Images stay on your device and are never uploaded. (146) | Image tools |
| `/developer-tools` | developer tools (not researched in P0) | Free Developer Tools Online: Private, Local \| KeptLocal (54) | Format JSON, decode JWTs, encode Base64 and URLs, compare text and test regex in your browser. Your input is never sent anywhere. (129) | Developer tools |

- H2 outline (as built): "<n> PDF tools" (the tool list) · Which tool do I need? · Guides (guides whose main tool is in the category, then short links to tools' "How to use" sections) · More tools (the other categories).
- Schema: BreadcrumbList · CollectionPage with an ItemList of the hub's tools.
- **Done (P8-T05):** "Which tool do I need?" says when to pick each tool of the hub (`choosing` in `hubs.ts`; a test requires every published tool once). It tells apart the tools users confuse: split vs organize vs PDF to JPG, compress vs resize vs convert, Base64 vs URL encoding. The guides from §4.4 are linked. No FAQ block on hubs (it would repeat the tool pages).

### 4.3 Site pages

| URL | Title | Description | H1 | H2 outline |
|---|---|---|---|---|
| `/about` | About KeptLocal (no suffix: the name is in it) | Who builds KeptLocal, how its PDF, image and developer tools run in your browser without uploading anything, and how to get in touch. | About KeptLocal | What KeptLocal is (tools by category) · How it works · Who runs it · Contact |
| `/privacy` | Privacy policy · KeptLocal | How KeptLocal handles your data: files and text are processed in your browser and never uploaded. No accounts, cookies, ads or analytics. | Privacy policy | Summary · What happens to your files and text · What is stored in your browser · Hosting · Analytics, cookies and ads · How to verify it yourself (`#verify`) · Changes to this policy · Contact |
| `/terms` | Terms of use · KeptLocal | The terms for using KeptLocal: free tools provided as is, a visual signature that is not a certified digital signature, and your responsibilities. | Terms of use | Using KeptLocal · Your files · Signatures · Results and accuracy · Open-source software · No warranty · Limitation of liability · Changes to these terms · Governing law · Contact |
| `/licenses` | Open-source licenses (as built) | as built | Open-source licenses | as built; generated from the license report in P8-T09 |

Facts these pages must state consistently (product facts, product.md §10): 19 tools; processing in the browser; no accounts; no cookies or ads at launch; no analytics at launch (P9-T19; if that changes, the Privacy page names the provider first); hosting on Cloudflare Pages; contact officialaliraza2005@gmail.com.

### 4.4 Guides

Topics, format and review process: [content-strategy.md](content-strategy.md). Copy lives in `src/guides/<slug>.tsx` (`meta`); `src/guides/registry.test.ts` enforces lengths and uniqueness.

| URL | Primary query (keyword-research) | Title | Main tool |
|---|---|---|---|
| `/guides` | | Guides: PDFs, Images and Code, Done Privately \| KeptLocal | |
| `/guides/remove-location-from-photos` | remove location from photo (iPhone, Android) | How to Remove Location Data from Photos \| KeptLocal | `remove-exif-data` |
| `/guides/what-is-inside-a-jwt` | decode jwt locally, is jwt decode safe | What’s Inside a JWT, and Is It Safe to Decode? \| KeptLocal | `jwt-decoder` |
| `/guides/heic-vs-jpg` | heic to jpg, safest heic to jpg converter | HEIC vs JPG: What’s the Difference, How to Convert \| KeptLocal | `convert-image` |

- H1 = the question or task; byline with author (linked to /about), published and updated dates; then the article, "Tools used in this guide" and "Sources".
- Schema: BreadcrumbList (KeptLocal › Guides › guide) · `Article` (headline, author, datePublished, dateModified, publisher, `citation` = sources) matching the visible byline. The index: BreadcrumbList · CollectionPage + ItemList.
- Next in the backlog: web image formats compared, with KeptLocal's own measurements (content-strategy §2).

## 5. Tool pages

Generated from the registry. Character counts in brackets. H2 outline is the page order: the tool's own sections, then the shared privacy section, FAQs and related tools.

### 5.1 PDF tools

#### `/merge-pdf`

| Field | Spec |
|---|---|
| Primary query | merge pdf |
| Secondary | combine pdf (G1 B1) |
| Title (48) | Merge PDF Online: Private, No Upload \| KeptLocal |
| Description (120) | Combine multiple PDF files into one in seconds. Files are processed on your device and never uploaded. Free, no sign-up. |
| H1 | Merge PDF files |
| H2 outline | How to merge PDF files · Formats and limits · What is kept in the merged file · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `split-pdf`, `organize-pdf`, `jpg-to-pdf`, `sign-pdf` |

- FAQs (5):
  - Are my PDF files uploaded to a server?
  - Can I merge password-protected PDFs?
  - Is there a limit on the number or size of files?
  - Does merging keep bookmarks and form fields?
  - Do I need to sign up or install anything?
- Review: OK. iPhone and offline questions are answered by the shared privacy section (§2.3) and the hub, not a page FAQ.

#### `/split-pdf`

| Field | Spec |
|---|---|
| Primary query | split pdf |
| Secondary | extract pages from pdf (G1 B1) |
| Title (49) | Split PDF & Extract Pages (No Upload) \| KeptLocal |
| Description (138) | Extract pages from a PDF or split it every N pages or into single pages, in your browser. Files never leave your device. Free, no sign-up. |
| H1 | Split PDF and extract pages |
| H2 outline | How to split a PDF · Page ranges · What is kept · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `merge-pdf`, `organize-pdf`, `pdf-to-jpg`, `sign-pdf` |

- FAQs (5):
  - How do I split a PDF into separate pages?
  - How do I extract pages into a new PDF?
  - Can I split a PDF without uploading it?
  - Is there a size limit?
  - How do I split a PDF on iPhone?
- Review: OK.

#### `/organize-pdf`

| Field | Spec |
|---|---|
| Primary query | organize pdf |
| Secondary | rearrange / reorder pdf pages, delete pages from pdf, rotate pdf |
| Title (55) | Organize PDF: Reorder, Rotate, Delete Pages \| KeptLocal |
| Description (136) | Rearrange, rotate and delete PDF pages with drag-and-drop thumbnails, undo and redo. Works in your browser; your file is never uploaded. |
| H1 | Organize PDF pages |
| H2 outline | How to organize PDF pages · Keyboard shortcuts · What happens to your pages · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `merge-pdf`, `split-pdf`, `sign-pdf`, `pdf-to-jpg` |

- FAQs (5):
  - How do I rearrange pages in a PDF?
  - How do I rotate a single page?
  - How do I delete pages from a PDF?
  - Is my PDF uploaded?
  - Does it work with large PDFs?
- Review: OK. Watch "delete pages from pdf" and "rotate pdf" in Search Console after launch (keyword-research §3.1); no new pages now.

#### `/jpg-to-pdf`

| Field | Spec |
|---|---|
| Primary query | jpg to pdf |
| Secondary | image to pdf, png to pdf, photo to pdf |
| Title (61) | JPG to PDF: Combine Images into a PDF (No Upload) \| KeptLocal |
| Description (138) | Convert JPG, PNG, WebP and other images to one PDF. Choose page size, orientation and margins; photos stay upright. Works in your browser. |
| H1 | JPG and other images to PDF |
| H2 outline | How to convert images to PDF · Options · Image quality · Formats and limits · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `merge-pdf`, `pdf-to-jpg`, `organize-pdf`, `compress-image` |

- FAQs (5):
  - Can I combine several JPGs into one PDF?
  - Does it work with PNG and iPhone photos?
  - Can I convert without uploading?
  - Will the quality be reduced?
  - How do I convert JPG to PDF on iPhone?
- Review: OK. Slug caveat stands until the manual Trends check (P0-T05).

#### `/pdf-to-jpg`

| Field | Spec |
|---|---|
| Primary query | pdf to jpg |
| Secondary | pdf to image, pdf to png |
| Title (65) | PDF to JPG & PNG: Convert Pages to Images (No Upload) \| KeptLocal |
| Description (128) | Convert PDF pages to JPG or PNG at 72, 150 or 300 DPI, all pages or a range. Your PDF stays on your device; nothing is uploaded. |
| H1 | PDF to JPG and PNG |
| H2 outline | How to convert PDF pages to images · Resolution and format · How it works · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `jpg-to-pdf`, `split-pdf`, `compress-image`, `organize-pdf` |

- FAQs (5):
  - How do I convert a PDF page to an image?
  - Which resolution should I choose?
  - JPG or PNG?
  - Is my PDF uploaded?
  - Can I convert a password-protected PDF?
- Review: OK. Slug caveat stands until the manual Trends check (P0-T05).

#### `/sign-pdf`

| Field | Spec |
|---|---|
| Primary query | sign pdf |
| Secondary | fill and sign pdf, add signature to pdf |
| Title (60) | Fill & Sign PDF: Sign and Fill Forms (No Upload) \| KeptLocal |
| Description (143) | Fill in PDF forms and add a drawn, typed or uploaded signature, text, dates and checkmarks. Your PDF stays on your device; nothing is uploaded. |
| H1 | Fill and sign a PDF |
| H2 outline | How to fill and sign a PDF · About the signature · How it works · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `merge-pdf`, `organize-pdf`, `split-pdf`, `jpg-to-pdf` |

- FAQs (5):
  - How do I sign a PDF?
  - Is this a legally valid signature?
  - Can I fill in a PDF form?
  - Is my PDF or signature uploaded?
  - What does “Flatten” do?
- Review: OK. The "legally valid" FAQ must keep saying plainly that this is a visual signature, not a certified digital signature (keyword-research §3.1).

### 5.2 Image tools

#### `/remove-exif-data`

| Field | Spec |
|---|---|
| Primary query | remove exif data |
| Secondary | remove metadata from photo, exif remover, remove location from photo |
| Title (57) | Remove EXIF Data and GPS Location from Photos \| KeptLocal |
| Description (133) | See what your photos reveal (GPS location, camera, dates) and remove it without changing a pixel. JPG, PNG and WebP, in your browser. |
| H1 | Remove EXIF data and location from photos |
| H2 outline | How to remove EXIF data from photos · What gets removed · Formats and limits · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `compress-image`, `resize-image`, `convert-image`, `jpg-to-pdf` |

- FAQs (5):
  - What is EXIF data?
  - How do I check what EXIF data a photo has?
  - Does removing EXIF reduce quality?
  - How do I remove the location from a photo on iPhone or Android?
  - Are my photos uploaded?
- Review: OK.

#### `/compress-image`

| Field | Spec |
|---|---|
| Primary query | compress image |
| Secondary | reduce image size, image compressor; size targets (compress image to 100kb) |
| Title (61) | Compress Image: Reduce JPG, PNG, WebP (No Upload) \| KeptLocal |
| Description (129) | Reduce JPG, PNG, WebP and AVIF file size with a quality slider and a before/after view, many images at once. Nothing is uploaded. |
| H1 | Compress images |
| H2 outline | How to compress images · Options · Smaller files, same look · Formats and limits · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `resize-image`, `convert-image`, `remove-exif-data`, `jpg-to-pdf` |

- FAQs (5):
  - How do I compress an image to 100 KB (or another target size)?
  - Does compression reduce quality?
  - Can I compress without losing quality?
  - Is it safe to compress images online?
  - Can I compress many images at once?
- Review: **Changed (P8-T02):** the description was the only file-tool description without a privacy statement; now it ends "Nothing is uploaded." **Accuracy (P8-T04):** keyword-research §2.5 assumes a target-size mode; the tool has none, and the FAQ correctly explains the slider route. Keep content honest; do not promise a target-size mode.

#### `/resize-image`

| Field | Spec |
|---|---|
| Primary query | resize image |
| Secondary | image resizer, crop image |
| Title (53) | Resize and Crop Images Online (No Upload) \| KeptLocal |
| Description (140) | Resize JPG, PNG, WebP and AVIF images to exact pixels, a percentage or common post sizes, or crop them to 1:1, 4:3 or 16:9. In your browser. |
| H1 | Resize and crop images |
| H2 outline | How to resize or crop images · Options · Sharp results · Formats and limits · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `compress-image`, `convert-image`, `remove-exif-data`, `jpg-to-pdf` |

- FAQs (5):
  - How do I resize without losing quality?
  - How do I resize for Instagram without cropping?
  - Can I resize to exact pixels or a percentage?
  - How do I make a photo smaller in KB?
  - Can I resize many images at once?
- Review: OK.

#### `/convert-image`

| Field | Spec |
|---|---|
| Primary query | heic to jpg / convert image |
| Secondary | webp to png, webp to jpg, image converter |
| Title (61) | Convert Image: HEIC, WebP, PNG to JPG (No Upload) \| KeptLocal |
| Description (135) | Convert HEIC iPhone photos, WebP, PNG, AVIF, GIF and BMP to JPG, PNG, WebP or AVIF, many at once. Private: it all runs in your browser. |
| H1 | Convert images: HEIC, WebP, PNG and more |
| H2 outline | How to convert images · Options · What changes when you convert · Formats and limits · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `compress-image`, `resize-image`, `jpg-to-pdf`, `remove-exif-data` |

- FAQs (5):
  - How do I convert HEIC to JPG?
  - Is it safe to convert iPhone photos online?
  - What happens to transparency when converting PNG to JPG?
  - Which format is smallest: WebP, AVIF or JPG?
  - Can I convert many images at once?
- Review: OK. `heic-to-jpg` stays a post-launch candidate page (Tier 2), not MVP.

### 5.3 Developer tools

#### `/json-formatter`

| Field | Spec |
|---|---|
| Primary query | json formatter |
| Secondary | json validator, json viewer, json beautifier |
| Title (58) | JSON Formatter, Validator & Viewer (No Upload) \| KeptLocal |
| Description (148) | Format, validate and explore JSON in your browser. Exact error line and column, tree view, minify and sort keys. Your data never leaves your device. |
| H1 | JSON formatter, validator and viewer |
| H2 outline | How to format and validate JSON · Options · Exact values, including large numbers · Formats and limits · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `jwt-decoder`, `base64-encode-decode`, `diff-checker`, `url-encode-decode` |

- FAQs (5):
  - Is my JSON sent anywhere?
  - How do I validate JSON?
  - Can I validate JSON against a JSON Schema?
  - How large a file can it handle?
  - Why does it warn about large numbers?
- Review: OK. The JSON Schema FAQ must keep saying it is not supported.

#### `/unix-timestamp-converter`

| Field | Spec |
|---|---|
| Primary query | unix timestamp converter |
| Secondary | epoch converter, timestamp converter |
| Title (54) | Unix Timestamp Converter (Epoch Converter) \| KeptLocal |
| Description (145) | Convert Unix timestamps to dates and back in any time zone. Detects seconds, milliseconds and microseconds, and shows the current Unix time live. |
| H1 | Unix timestamp converter (epoch converter) |
| H2 outline | How to convert a Unix timestamp · What a Unix timestamp is · Formats and units · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `jwt-decoder`, `uuid-generator`, `json-formatter`, `base64-encode-decode` |

- FAQs (6):
  - What is the current Unix timestamp?
  - Seconds or milliseconds: how can I tell?
  - How do I convert a timestamp to my time zone?
  - How do I convert a date to a Unix timestamp?
  - What is the year 2038 problem?
  - Is anything I enter sent anywhere?
- Review: OK. "Discord timestamp" is a separate intent; Tier 2 idea, not on this page.

#### `/base64-encode-decode`

| Field | Spec |
|---|---|
| Primary query | base64 decode / encode |
| Secondary | base64 encode decode, base64 to image |
| Title (62) | Base64 Encode & Decode: Text and Files (No Upload) \| KeptLocal |
| Description (149) | Encode and decode Base64 in your browser: text with emoji, URL-safe Base64, data URLs and files. Errors show the exact position. Nothing is uploaded. |
| H1 | Base64 encode and decode |
| H2 outline | How to encode or decode Base64 · Options · What Base64 is · Formats and limits · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `url-encode-decode`, `jwt-decoder`, `hash-generator`, `json-formatter` |

- FAQs (6):
  - Is my data uploaded when I decode Base64?
  - How do I decode Base64 to an image or file?
  - How do I convert an image or file to Base64?
  - What is URL-safe Base64?
  - Why does decoding fail with “isn’t a Base64 character”?
  - Is Base64 encryption?
- Review: OK.

#### `/url-encode-decode`

| Field | Spec |
|---|---|
| Primary query | url decoder / encoder |
| Secondary | url encode decode, url parser |
| Title (60) | URL Encode & Decode, plus URL Parser (No Upload) \| KeptLocal |
| Description (139) | Percent-encode or decode text and URLs, with %20 or + for spaces. Parse any URL into host, path and query parameters. Runs in your browser. |
| H1 | URL encode and decode |
| H2 outline | How to encode, decode or parse a URL · Options · How percent-encoding works · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `base64-encode-decode`, `json-formatter`, `jwt-decoder`, `hash-generator` |

- FAQs (6):
  - How do I URL-encode a space: %20 or +?
  - What characters need URL encoding?
  - What is the difference between encodeURI and encodeURIComponent?
  - Why does decoding fail?
  - Can it decode Safe Links or Proofpoint URLs?
  - Is my URL sent anywhere?
- Review: OK. The Safe Links / Proofpoint answer stays honest (shows the target, does not unwrap vendor formats).

#### `/uuid-generator`

| Field | Spec |
|---|---|
| Primary query | uuid generator |
| Secondary | guid generator, uuid v4, uuid v7 |
| Title (56) | UUID Generator: v4, v7 and ULID, Bulk (GUID) \| KeptLocal |
| Description (136) | Generate random UUID v4, time-ordered UUID v7 and ULIDs in bulk, uppercase or without hyphens. Inspect any UUID’s version and timestamp. |
| H1 | UUID generator (GUID) |
| H2 outline | How to generate UUIDs · UUID v4, v7 and ULID · How the values are made · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `hash-generator`, `unix-timestamp-converter`, `base64-encode-decode`, `json-formatter` |

- FAQs (6):
  - What is the difference between UUID v4 and v7?
  - Is a GUID the same as a UUID?
  - Are the generated UUIDs random and unique?
  - Can I generate UUIDs in bulk or without hyphens?
  - What is a ULID?
  - How do I find out when a UUID was created?
- Review: OK.

#### `/hash-generator`

| Field | Spec |
|---|---|
| Primary query | hash generator |
| Secondary | sha256 hash, md5 hash, checksum calculator |
| Title (56) | Hash Generator: SHA-256, MD5, SHA-1, SHA-512 \| KeptLocal |
| Description (146) | Hash text or files with SHA-256, MD5, SHA-1, SHA-384 and SHA-512, or compute an HMAC. Verify a download’s checksum. Files never leave your device. |
| H1 | Hash generator: SHA-256, MD5, SHA-1, SHA-512 |
| H2 outline | How to hash text or a file · Algorithms · How hashing works · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `base64-encode-decode`, `uuid-generator`, `jwt-decoder`, `diff-checker` |

- FAQs (5):
  - How do I verify a file checksum?
  - Can a SHA-256 or MD5 hash be decrypted?
  - Is MD5 secure?
  - What is HMAC?
  - Are my files uploaded?
- Review: OK. On the low-confidence watch list (keyword-research §4.2).

#### `/jwt-decoder`

| Field | Spec |
|---|---|
| Primary query | jwt decoder / decode jwt |
| Secondary | jwt decode, decode jwt locally, jwt decode offline |
| Title (53) | JWT Decoder & Verifier, Local and Private \| KeptLocal |
| Description (146) | Decode JSON Web Tokens in your browser: header, payload, exp, iat and nbf in readable time. Verify HS, RS, PS, ES and EdDSA signatures. No upload. |
| H1 | JWT decoder and verifier |
| H2 outline | How to decode and verify a JWT · What’s inside a JWT · Supported algorithms and keys · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `base64-encode-decode`, `json-formatter`, `unix-timestamp-converter`, `hash-generator` |

- FAQs (5):
  - Is it safe to paste a JWT here?
  - Can a JWT be decoded without the secret?
  - How do I verify the signature?
  - How do I check if a token is expired?
  - What is the difference between decoding and verifying?
- Review: OK.

#### `/diff-checker`

| Field | Spec |
|---|---|
| Primary query | diff checker |
| Secondary | text compare, compare text |
| Title (60) | Diff Checker: Compare Text and Files (No Upload) \| KeptLocal |
| Description (150) | Compare two texts or files side by side with line, word and character highlights. Ignore whitespace or case, copy a unified diff. Nothing is uploaded. |
| H1 | Diff checker: compare text and files |
| H2 outline | How to compare two texts · Options · How the comparison works · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `json-formatter`, `regex-tester`, `hash-generator`, `base64-encode-decode` |

- FAQs (5):
  - How do I compare two files?
  - Can I ignore whitespace or letter case?
  - Is my text uploaded?
  - Can I see word-level differences?
  - Can I get the changes as a patch?
- Review: OK.

#### `/regex-tester`

| Field | Spec |
|---|---|
| Primary query | regex tester |
| Secondary | regular expression tester; language modifiers (javascript) |
| Title (57) | Regex Tester for JavaScript, with Explanation \| KeptLocal |
| Description (150) | Test JavaScript regular expressions live: highlighted matches, numbered and named groups, replace preview and a plain-language explanation. No upload. |
| H1 | Regex tester (JavaScript) |
| H2 outline | How to test a regular expression · Replacement patterns · Safe by design · Troubleshooting · How your data stays private · Frequently asked questions · Related tools |
| Schema | BreadcrumbList · WebApplication · FAQPage |
| Related | `diff-checker`, `json-formatter`, `url-encode-decode`, `base64-encode-decode` |

- FAQs (5):
  - Which regex flavor does this use?
  - Why does my regex work here but not in Python?
  - What do the flags mean?
  - Why did my regex time out?
  - Is my text uploaded?
- Review: OK. JavaScript flavor stated in H1, title and FAQ.
