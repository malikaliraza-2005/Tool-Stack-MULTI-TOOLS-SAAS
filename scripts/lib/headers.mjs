// Minimal parser and matcher for Cloudflare Pages `_headers` files, used by the
// local static server so E2E and Lighthouse run under the same headers as
// production. Supports path rules, `*` splats, `:placeholder` segments and
// absolute-URL (host) rules. Detaching headers (`! Name`) is not supported.

/**
 * @typedef {{ pattern: string, headers: [string, string][] }} HeaderRule
 */

/**
 * @param {string} text
 * @returns {HeaderRule[]}
 */
export function parseHeaders(text) {
  /** @type {HeaderRule[]} */
  const rules = [];
  /** @type {HeaderRule | undefined} */
  let current;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    if (!current) throw new Error(`Header without a URL pattern: ${raw.trim()}`);
    const idx = raw.indexOf(":");
    if (idx === -1) throw new Error(`Invalid header line: ${raw.trim()}`);
    current.headers.push([raw.slice(0, idx).trim(), raw.slice(idx + 1).trim()]);
  }
  return rules;
}

/**
 * @param {string} pattern
 * @returns {RegExp}
 */
function patternToRegExp(pattern) {
  // A placeholder matches one host label (no dots) or one path segment.
  const convert = (part, placeholder) =>
    part
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/:[A-Za-z]\w*/g, placeholder);
  const absolute = pattern.match(/^(https?:\/\/[^/]*)(\/.*)?$/);
  const source = absolute
    ? convert(absolute[1], "[^/.]+") + convert(absolute[2] ?? "", "[^/]+")
    : convert(pattern, "[^/]+");
  return new RegExp(`^${source}$`);
}

/**
 * Returns the merged headers for a request. Rules match on path, or on
 * `https://host/path` when the pattern is an absolute URL.
 *
 * @param {HeaderRule[]} rules
 * @param {string} host e.g. "abc123.sprigkit.pages.dev"
 * @param {string} pathname e.g. "/merge-pdf"
 * @returns {Map<string, string>}
 */
export function headersFor(rules, host, pathname) {
  /** @type {Map<string, string>} */
  const result = new Map();
  for (const rule of rules) {
    const target = /^https?:\/\//.test(rule.pattern) ? `https://${host}${pathname}` : pathname;
    if (!patternToRegExp(rule.pattern).test(target)) continue;
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      const prev = result.get(key);
      result.set(key, prev ? `${prev}, ${value}` : value);
    }
  }
  return result;
}
