// License report for the /licenses page (dependencies-licenses §7, P8-T09).
// Runs before dev and build; writes .generated/licenses.json: every production
// package with its license and the text of its license file, which MIT, BSD
// and Apache notice terms ask us to show.

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

mkdirSync(".generated", { recursive: true });
writeFileSync(join(".generated", "licenses.json"), JSON.stringify(report));
console.log(`License report: ${report.length} packages → .generated/licenses.json`);
