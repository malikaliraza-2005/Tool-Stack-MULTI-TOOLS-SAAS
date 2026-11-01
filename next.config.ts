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
  webpack: (config, { webpack }) => {
    // jSquash's multithreaded AVIF and oxipng builds need SharedArrayBuffer,
    // which requires cross-origin isolation (COEP) that the site doesn't send,
    // so they never load (`threads()` is false). Leaving them out of the bundle
    // also avoids webpack's circular worker-chunk warning (architecture §8.4).
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/codec\/(enc\/avif_enc_mt|pkg-parallel\/squoosh_oxipng)\.js$/,
        contextRegExp: /@jsquash[\\/](avif|oxipng)$/,
      }),
    );
    return config;
  },
};

export default nextConfig;
