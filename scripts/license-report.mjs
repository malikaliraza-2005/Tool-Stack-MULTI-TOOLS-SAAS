// License report for the /licenses page (dependencies-licenses §7, P8-T09).
// Runs before dev and build and writes two gitignored files:
// - .generated/licenses.json: every production package and its license, for
//   the table on /licenses;
// - public/third-party-notices.txt: each distinct license text with the
//   packages using it, which MIT, BSD and Apache notice terms ask us to show.
//   A plain file keeps ~250 KB of text out of the page's HTML and payload.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { licenseOf, nameOf, packages, versionOf } from "./licenses-lib.mjs";

// Native, platform-specific build-time binaries (sharp, SWC, @napi-rs/canvas
// for pdf.js in Node). They differ per OS, so the page would differ per build
// machine, and none of them reaches the site.
const EXCLUDE = /^(@img\/|sharp$)|-(win32|darwin|linux|android|freebsd)-/;

// license-checker falls back to a README when there is no license file.
const LICENSE_FILE = /^(licen[cs]e|copying|notice)/i;

const production = await packages({ production: true });
const report = Object.entries(production)
  .filter(([id]) => !EXCLUDE.test(nameOf(id)))
  .map(([id, info]) => {
    const file = info.licenseFile && LICENSE_FILE.test(basename(info.licenseFile));
    return {
      name: nameOf(id),
      version: versionOf(id),
      license: licenseOf(id, info),
      repository: info.repository ?? null,
      text: file ? readFileSync(info.licenseFile, "utf8").trim() : null,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const texts = new Map();
for (const pkg of report) {
  if (pkg.text) texts.set(pkg.text, [...(texts.get(pkg.text) ?? []), pkg]);
}
const rule = "=".repeat(78);
const notices = [
  "Third-party software notices for QuietBench",
  "",
  "Each license text below is headed by its license and the packages it covers. Generated at",
  "build time from the production dependencies; the list is also on /licenses.",
  ...[...texts].flatMap(([text, pkgs]) => [
    "",
    rule,
    `${pkgs[0].license}: ${pkgs.map((pkg) => `${pkg.name}@${pkg.version}`).join(", ")}`,
    rule,
    "",
    text,
  ]),
  "",
  rule,
  "Packages without a license file (license as declared in package.json):",
  ...report.filter((pkg) => !pkg.text).map((pkg) => `${pkg.name}@${pkg.version}: ${pkg.license}`),
  "",
].join("\n");

mkdirSync(".generated", { recursive: true });
writeFileSync(
  join(".generated", "licenses.json"),
  JSON.stringify(report.map(({ text, ...pkg }) => ({ ...pkg, hasText: text !== null }))),
);
writeFileSync(join("public", "third-party-notices.txt"), notices);
console.log(
  `License report: ${report.length} packages, ${texts.size} license texts → .generated/licenses.json, public/third-party-notices.txt`,
);
