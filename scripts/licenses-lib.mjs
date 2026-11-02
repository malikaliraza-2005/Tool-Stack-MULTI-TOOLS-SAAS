// Shared by the license gate (check-licenses.mjs) and the /licenses report
// (license-report.mjs), so both read the dependency tree the same way.

import { promisify } from "node:util";
import { init } from "license-checker-rseidelsohn";

// Packages whose license field is missing or misdetected; verified by hand.
export const OVERRIDES = {
  geist: "OFL-1.1", // package.json: "SIL OPEN FONT LICENSE"; LICENSE.TXT is OFL-1.1
};

const check = promisify(init);

/** `@scope/name@1.2.3` → `@scope/name`. */
export const nameOf = (id) => id.slice(0, id.lastIndexOf("@"));
export const versionOf = (id) => id.slice(id.lastIndexOf("@") + 1);

// An array of licenses means the package declares several; treat it as a choice.
export const licenseOf = (id, info) =>
  OVERRIDES[nameOf(id)] ??
  (Array.isArray(info.licenses)
    ? `(${info.licenses.join(" OR ")})`
    : String(info.licenses ?? "UNKNOWN"));

/** `{ "<name>@<version>": info }` for the production tree, or every package. */
export function packages({ production }) {
  return check({ start: process.cwd(), excludePrivatePackages: true, production });
}
