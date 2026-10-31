// Shared time formatting for tools (no DOM).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365.2425 * DAY],
  ["month", (365.2425 / 12) * DAY],
  ["week", 7 * DAY],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
  ["second", 1000],
];

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 hours ago", "in 2 years", "now". Uses the largest whole unit. */
export function formatRelative(ms: number, now: number): string {
  const diff = ms - now;
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(diff) >= size) return relativeFormat.format(Math.trunc(diff / size), unit);
  }
  return relativeFormat.format(0, "second");
}
