import type { NextConfig } from "next";

// Static export only: no server runtime (architecture §3).
// Built with webpack (`--webpack`), not Turbopack: Turbopack's module workers
// fail to start in WebKit (architecture §8.2, D-14).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // no image optimization server in static export
  trailingSlash: false, // /merge-pdf → out/merge-pdf.html
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
