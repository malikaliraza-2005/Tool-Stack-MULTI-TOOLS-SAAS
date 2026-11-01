# Information Architecture

| | |
|---|---|
| **Last updated** | 2026-10-13 (Phase 2) |
| **Related** | [architecture.md §5](../04-architecture/architecture.md#5-routes) (routes) · [tool-registry.md](../04-architecture/tool-registry.md) · [ui-ux-specification.md](ui-ux-specification.md) · [risks-and-decisions.md](../06-delivery/risks-and-decisions.md) (D-11 slugs) |

## 1. Sitemap

```
/                         Homepage (instrument hero, index)            Phase 7
├─ /pdf-tools             PDF hub                                      Phase 7
│  └─ /merge-pdf, /split-pdf, /organize-pdf, /jpg-to-pdf, /pdf-to-jpg, /sign-pdf
├─ /image-tools           Image hub                                    Phase 7
│  └─ /compress-image, /convert-image, /resize-image, /remove-exif-data
├─ /developer-tools       Developer hub                                Phase 7
│  └─ /json-formatter, /jwt-decoder, /base64-encode-decode, /url-encode-decode,
│     /diff-checker, /regex-tester, /unix-timestamp-converter, /uuid-generator, /hash-generator
├─ /about                 Product facts                                Phase 8
├─ /privacy               How local processing works, how to verify    Phase 8
├─ /terms                                                              Phase 8
├─ /licenses              Third-party licenses (generated)             Phase 8 (started in Phase 6 for HEIC, D-6)
├─ /guides/[slug]         After MVP content starts
├─ /sitemap.xml, /robots.txt                                           Phase 8
└─ /_gallery              Component gallery: not linked, noindex, not in sitemap (Phase 2)
```

## 2. URL rules

- **Tools are flat:** `/<slug>`, not `/pdf/<slug>`. Slugs are final (D-11) and match search phrasing.
- Hubs are `/<category>-tools`.
- Lowercase, hyphenated, no trailing slash (`trailingSlash: false`), no file extensions. `/index.html` redirects to `/`.
- Reserved slugs (cannot be tools): `about`, `privacy`, `terms`, `licenses`, `guides`, hub slugs, `_gallery`.
- Tools never put user content in the URL (CLAUDE.md rule 4).

## 3. Navigation

| Place | Contents | Source |
|---|---|---|
| Header (≥ `md`) | Logo (→ `/`), category links **PDF · Image · Developer** (→ hubs), search trigger (⌘K / Ctrl K), theme menu | `Header`, `src/config/nav.ts` |
| Header (< `md`) | Logo, search icon, theme menu, **Menu** button opening a side sheet with the category links (with one-line descriptions) and the site links | `MobileNav` |
| Command palette | Tools, Recent (Phase 7), Go to, Actions (theme) | `CommandPalette` (static placeholder items until Phase 7) |
| Footer | Tagline; **Tools:** PDF tools, Image tools, Developer tools; **Sprigkit:** About, Privacy, Terms, Licenses; © year | `Footer` |
| Breadcrumbs | Home › Category hub › Tool, on tool and hub pages | `Breadcrumbs` (JSON-LD added with SEO in Phase 3/8) |

The current section is marked with `aria-current="page"` and the accent underline (the accent's "active navigation" role).

**Known gap:** until Phases 7–8, the hub and site-page links lead to the 404 page. They use `prefetch={false}` so no failing prefetches are made.

## 4. Internal linking (from the registry, Phase 3+)

Breadcrumbs, related tools, hub listings, the homepage index and the command palette are all generated from `src/tools/registry.ts`, so a tool added to the registry appears everywhere at once ([tool-registry.md §4](../04-architecture/tool-registry.md#4-what-the-registry-drives)).
