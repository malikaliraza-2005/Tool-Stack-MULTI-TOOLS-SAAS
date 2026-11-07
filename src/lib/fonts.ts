import localFont from "next/font/local";

// The Geist files from the `geist` package, declared here because its own
// exports fix `font-display: swap`. A late swap re-wraps headings on phones and
// pushes the workspace below them (CLS 0.2, P9-T03). With `optional`, a page
// keeps the size-adjusted fallback if the font isn't ready in time; the font is
// preloaded and precached, so that only happens on a slow first visit.

export const GeistSans = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "optional",
  preload: true,
});

export const GeistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "optional",
  preload: true,
  adjustFontFallback: false,
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Roboto Mono",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Courier New",
    "monospace",
  ],
});
