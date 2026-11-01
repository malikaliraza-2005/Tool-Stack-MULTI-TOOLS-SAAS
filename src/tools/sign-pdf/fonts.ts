// Handwriting fonts for typed signatures (OFL-1.1 or Apache-2.0, self-hosted
// from @fontsource). Imported by the tool UI only, and not preloaded: the
// files download when Type is first shown. next/font needs one literal call
// per font. No metric-matched fallback face: it points at local("Arial"),
// which is missing on Linux and would make document.fonts.load() reject.

import localFont from "next/font/local";

const dancingScript = localFont({
  src: "../../../node_modules/@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const greatVibes = localFont({
  src: "../../../node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const allura = localFont({
  src: "../../../node_modules/@fontsource/allura/files/allura-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const sacramento = localFont({
  src: "../../../node_modules/@fontsource/sacramento/files/sacramento-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const alexBrush = localFont({
  src: "../../../node_modules/@fontsource/alex-brush/files/alex-brush-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const mrDafoe = localFont({
  src: "../../../node_modules/@fontsource/mr-dafoe/files/mr-dafoe-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const yellowtail = localFont({
  src: "../../../node_modules/@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const herrVonMuellerhoff = localFont({
  src: "../../../node_modules/@fontsource/herr-von-muellerhoff/files/herr-von-muellerhoff-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const mrsSaintDelafield = localFont({
  src: "../../../node_modules/@fontsource/mrs-saint-delafield/files/mrs-saint-delafield-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const caveat = localFont({
  src: "../../../node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const homemadeApple = localFont({
  src: "../../../node_modules/@fontsource/homemade-apple/files/homemade-apple-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});
const cedarvilleCursive = localFont({
  src: "../../../node_modules/@fontsource/cedarville-cursive/files/cedarville-cursive-latin-400-normal.woff2",
  preload: false,
  display: "block",
  adjustFontFallback: false,
});

/** Typed signature styles, in the order the Type tab shows them. */
export const SIGNATURE_FONTS = [
  { id: "dancing-script", label: "Dancing Script", font: dancingScript },
  { id: "great-vibes", label: "Great Vibes", font: greatVibes },
  { id: "allura", label: "Allura", font: allura },
  { id: "sacramento", label: "Sacramento", font: sacramento },
  { id: "alex-brush", label: "Alex Brush", font: alexBrush },
  { id: "mr-dafoe", label: "Mr Dafoe", font: mrDafoe },
  { id: "yellowtail", label: "Yellowtail", font: yellowtail },
  { id: "herr-von-muellerhoff", label: "Herr Von Muellerhoff", font: herrVonMuellerhoff },
  { id: "mrs-saint-delafield", label: "Mrs Saint Delafield", font: mrsSaintDelafield },
  { id: "caveat", label: "Caveat", font: caveat },
  { id: "homemade-apple", label: "Homemade Apple", font: homemadeApple },
  { id: "cedarville-cursive", label: "Cedarville Cursive", font: cedarvilleCursive },
] as const;
