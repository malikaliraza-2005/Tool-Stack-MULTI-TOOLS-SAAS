import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE } from "@/lib/og";

const fonts = join(process.cwd(), "node_modules", "geist", "dist", "fonts");

/**
 * The 1200×630 Open Graph card, rendered at build time (P1-T23): brand mark,
 * optional category, title, one line of copy and "0 bytes uploaded". Files are
 * emitted without an extension; public/_headers serves them as image/png.
 */
export async function renderOgCard({
  category,
  title,
  text,
}: {
  category?: string;
  title: string;
  text: string;
}) {
  const [regular, semibold, mono] = await Promise.all([
    readFile(join(fonts, "geist-sans", "Geist-Regular.ttf")),
    readFile(join(fonts, "geist-sans", "Geist-SemiBold.ttf")),
    readFile(join(fonts, "geist-mono", "GeistMono-Regular.ttf")),
  ]);
  const c = OG_COLORS;

  // Satori takes inline styles only (no CSS variables): sizes are in image pixels.
  return new ImageResponse(
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: c.bg,
        color: c.fg,
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke={c.fg}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.75 13.25h16.5" />
          <path d="M6.5 13.25v6" />
          <path d="M17.5 13.25v6" />
          <circle cx="12" cy="9.25" r="2.6" fill={c.accent} stroke={c.accent} />
        </svg>
        <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>OfflineBench</span>
        {category && (
          <span style={{ fontSize: 28, color: c["fg-muted"], marginLeft: 8 }}>{category}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span style={{ fontSize: 88, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.05 }}>
          {title}
        </span>
        <span style={{ fontSize: 34, color: c["fg-muted"], lineHeight: 1.35, maxWidth: 960 }}>
          {text}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          alignSelf: "flex-start",
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 22,
          paddingRight: 22,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: c.border,
          borderRadius: 14,
          background: c.surface,
          fontFamily: "Geist Mono",
          fontSize: 28,
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 7, background: c.success }} />0 bytes
        uploaded
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
