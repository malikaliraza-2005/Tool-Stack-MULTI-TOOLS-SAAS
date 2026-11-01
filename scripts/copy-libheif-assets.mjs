// Copies the HEIC decoder (libheif-js, LGPL-3.0) to public/vendor/libheif-js-<version>/
// under the conditions of decision D-6 (risks-and-decisions.md):
//   1. the libheif-wasm files are copied unmodified and served as separate
//      files, loaded on intent by the image worker, never bundled, so a user
//      can replace them with a compatible build;
//   2. the license texts (LGPL-3.0 with GPL-3.0) sit next to them;
//   3. the corresponding source (vendor-src/*.tar.gz, committed) is served
//      from our own origin under source/.
// Runs before `dev` and `build`; the output is git-ignored.
//
// Usage: node scripts/copy-libheif-assets.mjs

import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "libheif-js");
const { version } = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
const vendor = join(root, "public", "vendor");
const target = join(vendor, `libheif-js-${version}`);

// Remove copies of other versions so stale files are never deployed.
if (existsSync(vendor)) {
  for (const entry of readdirSync(vendor)) {
    if (entry.startsWith("libheif-js-") && entry !== `libheif-js-${version}`) {
      rmSync(join(vendor, entry), { recursive: true, force: true });
    }
  }
}

// Only the ES module bundle is loaded (the WASM is inside it); the whole
// folder is copied as published so it stays the unmodified upstream build.
cpSync(join(source, "libheif-wasm"), join(target, "libheif-wasm"), { recursive: true });
cpSync(join(source, "LICENSE"), join(target, "LICENSE"));
cpSync(join(source, "README.md"), join(target, "README.md"));

const sources = join(root, "vendor-src");
const tarballs = readdirSync(sources).filter((name) => name.endsWith(".tar.gz"));
if (!tarballs.some((name) => name.startsWith(`libheif-js-${version}`))) {
  throw new Error(
    `vendor-src/ has no source for libheif-js ${version}. Add the matching tarballs (see vendor-src/README.md).`,
  );
}
for (const name of tarballs) cpSync(join(sources, name), join(target, "source", name));

console.log(`Copied libheif-js ${version} and its sources to public/vendor/libheif-js-${version}/`);
