import type { NextConfig } from "next";

// A production build without the site URL would point every canonical, the
// sitemap and robots.txt at localhost (P9-T17). Cloudflare Pages sets
// CF_PAGES and CF_PAGES_BRANCH; main is the production branch.
if (
  process.env.CF_PAGES === "1" &&
  process.env.CF_PAGES_BRANCH === "main" &&
  !process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be set to the https:// production origin.");
}

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
    // The service-worker route (app/serwist) runs only at build time; it reads
    // the browserslist config through a dynamic require, which webpack flags.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules[\\/]browserslist[\\/]node\.js$/ },
    ];
    return config;
  },
};

export default nextConfig;
