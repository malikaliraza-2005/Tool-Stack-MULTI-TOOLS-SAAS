import { createSerwistRoute } from "@serwist/turbopack";
import { CATEGORIES, CATEGORY_ORDER, publishedTools } from "@/tools/registry";

// Builds the service worker (src/sw.ts) at build time into out/serwist/sw.js
// (architecture §10, P1-T22). Pages are listed here because HTML is not in
// Serwist's default precache; a new revision on each build refreshes them.
const revision = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? `${Date.now()}`;

const PAGES = [
  "/",
  ...CATEGORY_ORDER.map((category) => CATEGORIES[category].href),
  ...publishedTools().map((tool) => `/${tool.slug}`),
  "/licenses",
  "/search-index.json",
];

/**
 * On-intent libraries larger than this (pdf.js, pdf-lib) are cached the first
 * time a tool loads them instead. The shell is always precached, whatever its
 * size: without React a page can't hydrate offline.
 */
const LARGE_ON_INTENT_BYTES = 300 * 1024;
const SHELL_CHUNK =
  /\/_next\/static\/chunks\/(?:(?:framework|main|main-app|webpack|polyfills)-|app\/)/;

function precached(entry: { url: string; size: number }): boolean {
  // Codec WASM is runtime-cached. The component gallery is unlinked and only
  // for design review.
  if (entry.url.endsWith(".wasm") || entry.url.includes("%5Fgallery")) return false;
  return SHELL_CHUNK.test(entry.url) || entry.size <= LARGE_ON_INTENT_BYTES;
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "src/sw.ts",
    useNativeEsbuild: true,
    esbuildOptions: { format: "iife" },
    globPatterns: [
      ".next/static/**/*.{js,css,json,png,svg,ico,webmanifest}",
      // Preloaded fonts only (next/font marks them `.p.`): Geist Sans and Mono.
      // Signature fonts load in sign-pdf on intent and are cached then.
      ".next/static/media/*.p.woff2",
      "public/**/*",
    ],
    globIgnores: [
      // Cloudflare Pages doesn't serve its config files; precaching them fails install.
      "public/_headers",
      "public/_redirects",
      // Copied pdf.js and libheif assets: runtime-cached when a tool needs them.
      "public/vendor/**",
    ],
    // Sizes are filtered in `precached`, which knows the shell from the rest.
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
    manifestTransforms: [
      async (entries) => ({
        manifest: entries.filter(precached).map((entry) => ({
          ...entry,
          // Chunk folders keep route names ("[tool]", "%5Fgallery"). Pages
          // request them encoded ("%5Btool%5D"), and the URL parser leaves
          // brackets as they are, so unencoded keys would never match.
          url: encodeURI(entry.url),
        })),
        warnings: [],
      }),
    ],
    additionalPrecacheEntries: PAGES.map((url) => ({ url, revision })),
  },
);
