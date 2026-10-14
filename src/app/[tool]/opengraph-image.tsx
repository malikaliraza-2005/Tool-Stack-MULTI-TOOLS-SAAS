import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE } from "@/lib/og";
import { CATEGORIES, getTool, publishedTools } from "@/tools/registry";

// Open Graph image per tool, rendered at build time (P1-T23). The file is
// emitted without an extension; public/_headers serves it as image/png.
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Sprigkit tool";

export function generateStaticParams() {
  return publishedTools().map((tool) => ({ tool: tool.slug }));
}

const fonts = join(process.cwd(), "node_modules", "geist", "dist", "fonts");

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const tool = getTool((await params).tool);
  if (!tool) throw new Error("Unknown tool");
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
          <path d="M12 21V9" />
          <path d="M12 17c-3.6 0-5.8-1.9-6.5-5.2 3.6 0 5.8 1.9 6.5 5.2Z" />
          <path d="M12 13.5c3.6 0 5.8-1.9 6.5-5.2-3.6 0-5.8 1.9-6.5 5.2Z" />
          <circle cx="12" cy="5.5" r="2.25" fill={c.accent} stroke={c.accent} />
        </svg>
        <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>Sprigkit</span>
        <span style={{ fontSize: 28, color: c["fg-muted"], marginLeft: 8 }}>
          {CATEGORIES[tool.category].name}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span style={{ fontSize: 88, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.05 }}>
          {tool.name}
        </span>
        <span style={{ fontSize: 34, color: c["fg-muted"], lineHeight: 1.35, maxWidth: 960 }}>
          {tool.tagline}
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
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
