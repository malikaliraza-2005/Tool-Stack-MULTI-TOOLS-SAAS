# Corresponding source for the HEIC decoder

Sprigkit serves `libheif-js` 1.23.5 (LGPL-3.0) as a separate, unmodified file for HEIC decoding. Under decision D-6 ([risks-and-decisions.md](../docs/06-delivery/risks-and-decisions.md#d-6-heic-support)) the exact source is self-hosted: `scripts/copy-libheif-assets.mjs` copies these tarballs to `/vendor/libheif-js-1.23.5/source/` at build time, and the `/licenses` page links to them.

| File                               | What                                                                                           | Upstream                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `libheif-1.23.5.tar.gz`            | libheif v1.23.5 (commit `413e2a8`), the library compiled into the WASM                         | https://github.com/strukturag/libheif/releases/tag/v1.23.5            |
| `libde265-1.0.15.tar.gz`           | libde265 1.0.15, the HEVC decoder linked in (the only codec enabled; AOM and OpenJPEG are off) | https://github.com/strukturag/libde265/releases/tag/v1.0.15           |
| `libheif-emscripten-1.23.5.tar.gz` | Build scripts that produced the WASM (Emscripten 3.1.61, `USE_WASM=1 USE_UNSAFE_EVAL=0`)       | https://github.com/catdad-experiments/libheif-emscripten/tree/v1.23.5 |
| `libheif-js-1.23.5.tar.gz`         | The npm package's packaging scripts                                                            | https://github.com/catdad-experiments/libheif-js/tree/1.23.5          |

SHA-256 (downloaded 2026-11-01):

```
fd9036064c4432f0550d15072ddf34956a248279ee9aeaff0fba3fa0f77d8f1a  libheif-1.23.5.tar.gz
00251986c29d34d3af7117ed05874950c875dd9292d016be29d3b3762666511d  libde265-1.0.15.tar.gz
8e3395ca983e369448bea84d223c35f1117373953e00219588415f1bc37c86ea  libheif-emscripten-1.23.5.tar.gz
b2bcc4d1e94a47eff30afa05671374170f2f9f5ad88dd2e3cb1196d2df4d6f76  libheif-js-1.23.5.tar.gz
```

**When upgrading `libheif-js`:** replace all four tarballs with the versions that build uses (libheif tag from libheif-emscripten's `libheif` submodule; libde265 from `LIBDE265_VERSION` in libheif's `build-emscripten.sh`), update this file and `LIBHEIF_VERSION` in `src/lib/image/heic.ts`. The copy script fails the build if the libheif-js source is missing.
