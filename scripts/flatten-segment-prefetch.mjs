// Next.js 16's static export writes per-segment prefetch files as folders
// (`merge-pdf/__next.$d$tool/__PAGE__.txt`), but the client requests them
// with dots (`merge-pdf/__next.$d$tool.__PAGE__.txt`), so every <Link>
// prefetch of those routes was a 404 (navigation still worked, by loading the
// full payload). This writes a dotted copy of each nested file. Runs after
// `build`.
//
// Usage: node scripts/flatten-segment-prefetch.mjs [--dir out]

import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(
  process.argv.includes("--dir") ? process.argv[process.argv.indexOf("--dir") + 1] : "out",
);
if (!existsSync(root)) {
  console.error(`No build output at ${root}. Run "npm run build" first.`);
  process.exit(1);
}

/** @param {string} dir */
function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

let copied = 0;
for (const dir of readdirSync(root)) {
  const routeDir = join(root, dir);
  if (dir === "_next" || !statSync(routeDir).isDirectory()) continue;
  for (const segmentDir of readdirSync(routeDir)) {
    const top = join(routeDir, segmentDir);
    if (!segmentDir.startsWith("__next.") || !statSync(top).isDirectory()) continue;
    for (const file of files(top)) {
      // __next.$d$tool/__PAGE__.txt → __next.$d$tool.__PAGE__.txt
      const dotted = relative(routeDir, file).split(sep).join(".");
      copyFileSync(file, join(routeDir, dotted));
      copied++;
    }
  }
}
console.log(`Segment prefetch files: ${copied} dotted copies written.`);
