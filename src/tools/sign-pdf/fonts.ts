// Handwriting fonts for typed signatures (OFL-1.1, self-hosted from
// @fontsource). Imported by the tool UI only, and not preloaded: the files
// download when Type is first used.

import localFont from "next/font/local";

const caveat = localFont({
  src: "../../../node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff2",
  preload: false,
  display: "block",
});
const dancingScript = localFont({
  src: "../../../node_modules/@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff2",
  preload: false,
  display: "block",
});
const greatVibes = localFont({
  src: "../../../node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2",
  preload: false,
  display: "block",
});

export const SIGNATURE_FONTS = [
  { id: "dancing-script", label: "Dancing Script", font: dancingScript },
  { id: "great-vibes", label: "Great Vibes", font: greatVibes },
  { id: "caveat", label: "Caveat", font: caveat },
] as const;
