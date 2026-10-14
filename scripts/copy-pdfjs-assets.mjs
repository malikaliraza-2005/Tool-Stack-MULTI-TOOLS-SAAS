// Copies pdf.js's runtime assets (WASM image decoders, CMaps, standard fonts,
// ICC profile) to public/vendor/pdfjs-<version>/ so they are served from our
// own origin, never a CDN (architecture §8.2). Runs before `dev` and `build`;
// the output is git-ignored.
//
// Not copied: the QuickJS engine (`quickjs-eval.*`), used only for JavaScript
// inside PDFs, which Sprigkit never enables.
//
// Usage: node scripts/copy-pdfjs-assets.mjs

import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "pdfjs-dist");
const { version } = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
const vendor = join(root, "public", "vendor");
const target = join(vendor, `pdfjs-${version}`);

const FOLDERS = ["wasm", "cmaps", "standard_fonts", "iccs"];
const SKIP = /^quickjs-eval\./;

// Remove copies of other pdf.js versions so stale files are never deployed.
if (existsSync(vendor)) {
  for (const entry of readdirSync(vendor)) {
    if (entry.startsWith("pdfjs-") && entry !== `pdfjs-${version}`) {
      rmSync(join(vendor, entry), { recursive: true, force: true });
    }
  }
}

for (const folder of FOLDERS) {
  cpSync(join(source, folder), join(target, folder), {
    recursive: true,
    filter: (path) => !SKIP.test(path.split(/[\\/]/).pop() ?? ""),
  });
}
cpSync(join(source, "LICENSE"), join(target, "LICENSE"));

console.log(`Copied pdf.js ${version} assets to public/vendor/pdfjs-${version}/`);
