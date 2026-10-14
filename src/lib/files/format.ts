// Human-readable sizes and counts (content-voice-ux-copy §2: numerals, unit after a space).

const UNITS = ["bytes", "KB", "MB", "GB"] as const;

/** 1024-based, like file managers: 1536 → "1.5 KB", 104857600 → "100 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 bytes";
  if (bytes < 1024) return bytes === 1 ? "1 byte" : `${bytes} bytes`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  // One decimal below 10 ("4.2 MB"), none above ("42 MB"); "4.0" shows as "4".
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${UNITS[unit]}`;
}

/** "1 page", "3 pages", "1,204 pages". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : pluralForm}`;
}
