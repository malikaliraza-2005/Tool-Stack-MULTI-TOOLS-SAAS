// Renders the raster brand icons from src/app/icon.svg (P2-T01). Run after
// changing the icon: `node scripts/generate-icons.mjs`. Uses Playwright's
// Chromium (a dev dependency) so no image library is needed.
//
// Outputs (committed):
//   src/app/favicon.ico      16, 32 and 48 px PNGs in an ICO container
//   src/app/apple-icon.png   180 px (Next.js metadata file convention)
//   public/icons/icon-192.png, icon-512.png  for the web app manifest (Phase 7)
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const svg = await readFile(new URL("src/app/icon.svg", root), "utf8");

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace(
      "<svg ",
      `<svg width="${size}" height="${size}" `,
    )}</body></html>`,
  );
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

/** ICO with embedded PNG images (supported by all current browsers). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4); // color planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

const favicon = [];
for (const size of [16, 32, 48]) favicon.push({ size, png: await render(size) });
await writeFile(new URL("src/app/favicon.ico", root), ico(favicon));
await writeFile(new URL("src/app/apple-icon.png", root), await render(180));
await writeFile(new URL("public/icons/icon-192.png", root), await render(192));
await writeFile(new URL("public/icons/icon-512.png", root), await render(512));

await browser.close();
console.log("Icons written.");
