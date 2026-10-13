import type { NextConfig } from "next";

// Static export only: no server runtime (architecture §3).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // no image optimization server in static export
  trailingSlash: false, // /merge-pdf → out/merge-pdf.html
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
