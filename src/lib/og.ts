// Light-theme tokens as sRGB hex for build-time Open Graph images: the image
// renderer (Satori) reads neither CSS variables nor OKLCH. Kept equal to the
// tokens in globals.css by tokens.test.ts.

export const OG_COLORS = {
  bg: "#fbfaf7",
  surface: "#ffffff",
  fg: "#1e1a15",
  "fg-muted": "#625d56",
  border: "#e0deda",
  accent: "#c94b00",
  success: "#187a3b",
} as const;

export const OG_SIZE = { width: 1200, height: 630 } as const;
