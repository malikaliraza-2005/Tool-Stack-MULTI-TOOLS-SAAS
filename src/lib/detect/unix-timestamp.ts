import type { Detector } from "./types";

const MS_PER_UNIT: Record<number, number> = { 10: 1000, 13: 1, 16: 0.001 };

// A plausible date range for a pasted timestamp: 2000-01-01 to 2100-01-01 (UTC).
const EARLIEST = Date.UTC(2000, 0, 1);
const LATEST = Date.UTC(2100, 0, 1);

/** A 10, 13 or 16 digit integer (s, ms, µs) in a plausible date range (tool-registry §5). */
export const unixTimestampDetector: Detector = {
  id: "unix-timestamp",
  detect(text) {
    const trimmed = text.trim();
    if (!/^\d{10}$|^\d{13}$|^\d{16}$/.test(trimmed)) return 0;
    const ms = Number(trimmed) * MS_PER_UNIT[trimmed.length]!;
    return ms >= EARLIEST && ms < LATEST ? 0.8 : 0;
  },
};
