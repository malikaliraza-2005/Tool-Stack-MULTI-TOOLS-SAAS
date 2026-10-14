// License gate (dependencies-licenses.md §1). Fails CI when:
// - a production dependency's license is not on the allow-list and the package
//   has no name-scoped exception below, or
// - any dependency (including dev tooling) uses a forbidden license.
//
// Usage: node scripts/check-licenses.mjs [--report licenses.json]

import { writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { init } from "license-checker-rseidelsohn";

const ALLOWED = new Set([
  "MIT",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Apache-2.0",
  "0BSD",
  "Unlicense",
  "CC0-1.0",
  "OFL-1.1",
]);

const FORBIDDEN = /\b(A?GPL|SSPL|BUSL|NC|Non-?Commercial|UNLICENSED|UNKNOWN)\b/i;

// Exact package names (or name prefixes ending in "*") allowed with another
// license in the production tree. Every entry needs a recorded reason in
// dependencies-licenses.md.
const EXCEPTIONS = [
  // D-6: HEIC decoder, shipped as a separate unmodified file under LGPL-3.0 conditions.
  { name: "libheif-js", license: /^LGPL-3\.0/ },
  // Optional native image optimizer of `next`. Never executed (images.unoptimized)
  // and never part of the static output.
  { name: "@img/sharp-*", license: /LGPL-3\.0/ },
  // Deflate used by pdf-lib (merge-pdf worker). Zlib is a permissive license
  // (OSI-approved, attribution only) not yet on the allow-list (Phase 3).
  { name: "pako", license: /^\(MIT AND Zlib\)$/ },
  // Browser-support data read by build tools; not shipped to users.
  { name: "caniuse-lite", license: /^CC-BY-4\.0$/ },
];

// Packages whose license field is missing or misdetected; verified by hand.
const OVERRIDES = {
  geist: "OFL-1.1", // package.json: "SIL OPEN FONT LICENSE"; LICENSE.TXT is OFL-1.1
};

const check = promisify(init);
const common = { start: process.cwd(), excludePrivatePackages: true };
const production = await check({ ...common, production: true });
const all = await check(common);

const nameOf = (id) => id.slice(0, id.lastIndexOf("@"));
// An array of licenses means the package declares several; treat it as a choice.
const licenseOf = (id, info) =>
  OVERRIDES[nameOf(id)] ??
  (Array.isArray(info.licenses)
    ? `(${info.licenses.join(" OR ")})`
    : String(info.licenses ?? "UNKNOWN"));
const isException = (id, license) =>
  EXCEPTIONS.some(({ name, license: re }) => {
    const pkg = nameOf(id);
    const matches = name.endsWith("*") ? pkg.startsWith(name.slice(0, -1)) : pkg === name;
    return matches && re.test(license);
  });

// Evaluates an SPDX expression: OR needs one allowed side, AND needs all; AND binds
// tighter than OR and parentheses group, e.g. "(MIT OR Apache-2.0) AND MPL-2.0".
function isAllowed(license) {
  const tokens = license.match(/\(|\)|[^\s()]+/g) ?? [];
  let pos = 0;
  const parseOr = () => {
    let ok = parseAnd();
    while (tokens[pos] === "OR") {
      pos++;
      ok = parseAnd() || ok;
    }
    return ok;
  };
  const parseAnd = () => {
    let ok = parseTerm();
    while (tokens[pos] === "AND") {
      pos++;
      ok = parseTerm() && ok;
    }
    return ok;
  };
  const parseTerm = () => {
    const token = tokens[pos++];
    if (token === "(") {
      const ok = parseOr();
      if (tokens[pos++] !== ")") return false;
      return ok;
    }
    return token !== undefined && ALLOWED.has(token);
  };
  const ok = parseOr();
  return ok && pos === tokens.length;
}

const failures = [];
for (const [id, info] of Object.entries(production)) {
  const license = licenseOf(id, info);
  if (!isAllowed(license) && !isException(id, license)) {
    failures.push(`${id}: ${license} (production dependency not on the allow-list)`);
  }
}
for (const [id, info] of Object.entries(all)) {
  const license = licenseOf(id, info);
  if (FORBIDDEN.test(license) && !isException(id, license)) {
    failures.push(`${id}: ${license} (forbidden license)`);
  }
}

const reportIdx = process.argv.indexOf("--report");
if (reportIdx !== -1) {
  const report = Object.entries(production).map(([id, info]) => ({
    package: id,
    license: licenseOf(id, info),
    repository: info.repository ?? null,
  }));
  writeFileSync(process.argv[reportIdx + 1], JSON.stringify(report, null, 2));
}

const counts = `${Object.keys(production).length} production / ${Object.keys(all).length} total packages`;
if (failures.length > 0) {
  console.error(`License check failed (${counts}):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`License check passed (${counts}).`);
