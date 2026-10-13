// Serves the static export (`out/`) the way Cloudflare Pages does, for E2E and
// Lighthouse CI: clean URLs (/about → about.html), 404.html with status 404,
// headers from `out/_headers`, and gzip. Local only; not used in production.
//
// Usage: node scripts/serve-out.mjs [--port 4173]

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";
import { headersFor, parseHeaders } from "./lib/headers.mjs";

const root = resolve(
  process.argv.includes("--dir") ? process.argv[process.argv.indexOf("--dir") + 1] : "out",
);
const port = Number(
  process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : 4173,
);

if (!existsSync(root)) {
  console.error(`No build output at ${root}. Run "npm run build" first.`);
  process.exit(1);
}

const headersFile = join(root, "_headers");
const rules = existsSync(headersFile) ? parseHeaders(readFileSync(headersFile, "utf8")) : [];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf",
  ".map": "application/json",
};
const COMPRESSIBLE = new Set([
  ".html",
  ".txt",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".svg",
  ".webmanifest",
  ".map",
  ".wasm",
]);

/** @param {string} p */
function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** @param {string} pathname */
function resolveFile(pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const base = join(root, safe);
  if (base !== root && !base.startsWith(root + sep)) return undefined;
  for (const candidate of [base, `${base}.html`, join(base, "index.html")]) {
    if (isFile(candidate)) return candidate;
  }
  return undefined;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const host = req.headers.host ?? "localhost";

  // Cloudflare Pages redirects /page.html and /page/ to /page.
  if (url.pathname !== "/" && (url.pathname.endsWith(".html") || url.pathname.endsWith("/"))) {
    const clean = url.pathname.replace(/(\/index)?\.html$/, "").replace(/\/+$/, "") || "/";
    if (clean !== url.pathname) {
      res.writeHead(308, { Location: clean + url.search });
      res.end();
      return;
    }
  }

  let file = resolveFile(url.pathname);
  let status = 200;
  if (!file) {
    file = join(root, "404.html");
    status = 404;
  }

  const ext = extname(file);
  const headers = Object.fromEntries(headersFor(rules, host, url.pathname));
  // `upgrade-insecure-requests` would rewrite same-origin http:// requests to
  // https:// on a plain-http local server; Cloudflare always serves https.
  if (headers["content-security-policy"]) {
    headers["content-security-policy"] = headers["content-security-policy"].replace(
      /;\s*upgrade-insecure-requests/,
      "",
    );
  }
  headers["content-type"] = TYPES[ext] ?? "application/octet-stream";

  const gzip =
    COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
  if (gzip) {
    headers["content-encoding"] = "gzip";
    headers["vary"] = "Accept-Encoding";
  }
  res.writeHead(status, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
