// Output file names (tool-specifications §2.2): `<original>-<action>.<ext>`.

// Characters file systems reject, plus control characters.
const INVALID = /[\u0000-\u001f\u007f<>:"/\\|?*]+/g;

/** "report.pdf" → "report". Leaves dot-files and names without an extension alone. */
export function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Replaces characters file systems reject and trims dots and spaces at the ends. */
export function sanitizeFileName(name: string): string {
  return name
    .replace(INVALID, "-")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 200);
}

/** Adds `.ext` unless the name already ends with it (case-insensitive). */
export function ensureExtension(name: string, ext: string): string {
  const dotExt = ext.startsWith(".") ? ext : `.${ext}`;
  return name.toLowerCase().endsWith(dotExt.toLowerCase()) ? name : `${name}${dotExt}`;
}

/** `outputFileName("report.pdf", "merged", "pdf")` → "report-merged.pdf". */
export function outputFileName(original: string, action: string, ext: string): string {
  const base = sanitizeFileName(baseName(original)) || "file";
  return ensureExtension(`${base}-${action}`, ext);
}

/**
 * A user-edited output name: sanitized, extension enforced, and `fallback`
 * when nothing usable is left.
 */
export function userFileName(input: string, ext: string, fallback: string): string {
  const dotExt = ext.startsWith(".") ? ext : `.${ext}`;
  if (input.trim().toLowerCase() === dotExt.toLowerCase()) return fallback;
  const clean = sanitizeFileName(input);
  return clean ? ensureExtension(clean, ext) : fallback;
}

/** Makes names unique, e.g. for a ZIP: "a.pdf", "a (2).pdf", … */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
  });
}
