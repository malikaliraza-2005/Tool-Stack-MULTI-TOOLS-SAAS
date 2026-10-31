// Unix timestamp ↔ date conversion (tool-specifications §5.7). Pure functions:
// no DOM, no React. Time zones use the browser's Intl data.

import { toolErrors, type ToolError } from "@/lib/errors";

export type TimestampUnit = "s" | "ms" | "us";

export const UNIT_NAMES: Record<TimestampUnit, string> = {
  s: "seconds",
  ms: "milliseconds",
  us: "microseconds",
};

const MS_PER_UNIT: Record<TimestampUnit, bigint> = { s: 1000n, ms: 1n, us: 1n };

/** The ECMAScript Date range: ±100,000,000 days around 1970. */
const MAX_DATE_MS = 8.64e15;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Unit from digit count (sign excluded): up to 11 digits are seconds, 12–14
 * milliseconds, 15–17 microseconds. 10, 13 and 16 digits are today's dates.
 */
export function detectUnit(digits: number): TimestampUnit | null {
  if (digits <= 11) return "s";
  if (digits <= 14) return "ms";
  if (digits <= 17) return "us";
  return null;
}

export type ParsedTimestamp = {
  /** Milliseconds since 1970-01-01T00:00:00Z, floored to whole milliseconds. */
  ms: number;
  unit: TimestampUnit;
  /** True when the unit came from the digit count. */
  detected: boolean;
  digits: number;
  /** Microseconds beyond `ms` (0–999), for microsecond input. */
  extraMicros: number;
};

export type ParseResult = { ok: true; value: ParsedTimestamp } | { ok: false; error: ToolError };

/**
 * Parses an integer timestamp. Spaces, underscores and thousands separators
 * are ignored ("1 700 000 000", "1_700_000_000"); a leading "-" is a date
 * before 1970.
 */
export function parseTimestamp(text: string, unit: TimestampUnit | "auto" = "auto"): ParseResult {
  const cleaned = text.trim().replace(/[\s_,]/g, "");
  if (cleaned === "") return fail("Enter a Unix timestamp, for example 1700000000.");
  const match = /^([+-]?)(\d+)$/.exec(cleaned);
  if (!match) {
    if (/^[+-]?\d*\.\d+$/.test(cleaned)) {
      return fail(
        "Enter a whole number. For a fraction of a second, use milliseconds (for example 1700000000500).",
      );
    }
    return fail("A Unix timestamp contains only digits, with an optional “-” before 1970.");
  }
  const [, sign, digitText = ""] = match;
  const digits = digitText.replace(/^0+(?=\d)/, "").length;
  const resolved = unit === "auto" ? detectUnit(digits) : unit;
  if (!resolved) {
    return fail(
      `${digits} digits is too long for seconds, milliseconds or microseconds. Check that the number is complete and has no extra digits.`,
    );
  }

  const raw = BigInt(digitText) * (sign === "-" ? -1n : 1n);
  // Floor division, so pre-1970 microseconds round toward the earlier millisecond.
  let ms = resolved === "us" ? raw / 1000n : raw * MS_PER_UNIT[resolved];
  let extraMicros = resolved === "us" ? Number(raw % 1000n) : 0;
  if (extraMicros < 0) {
    ms -= 1n;
    extraMicros += 1000;
  }
  if (ms > BigInt(MAX_DATE_MS) || ms < -BigInt(MAX_DATE_MS)) {
    return fail(
      `This is out of range as ${UNIT_NAMES[resolved]}: dates must fall between the years −271,821 and 275,760.${
        unit === "auto" ? "" : " Check the unit."
      }`,
    );
  }
  return {
    ok: true,
    value: { ms: Number(ms), unit: resolved, detected: unit === "auto", digits, extraMicros },
  };
}

function fail(message: string): { ok: false; error: ToolError } {
  return { ok: false, error: toolErrors.invalidInput(message) };
}

// ---------------------------------------------------------------------------
// Time zones

/**
 * Zones that Chromium and Safari still list under their old names (CLDR
 * keeps them for stability). Users search for the current name.
 */
export const RENAMED_ZONES: Readonly<Record<string, string>> = {
  "America/Godthab": "America/Nuuk",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

/** The current IANA name of `zone`, when the browser accepts it. */
export function currentZoneName(zone: string): string {
  const renamed = RENAMED_ZONES[zone];
  return renamed && isValidTimeZone(renamed) ? renamed : zone;
}

/** The browser's time zone, e.g. "Europe/Berlin". */
export function localTimeZone(): string {
  return currentZoneName(new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
}

/** Every IANA time zone the browser knows, with "UTC" first. */
export function timeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  // Some browsers leave "UTC" or the local zone out of the list.
  return [...new Set(["UTC", ...supported.map(currentZoneName), localTimeZone()])];
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      era: "short",
    });
    partsFormatters.set(zone, formatter);
  }
  return formatter;
}

/** A calendar date and wall-clock time, without a zone. Month is 1–12. */
export type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

/** The wall-clock time in `zone` at instant `ms`. */
export function wallTimeIn(ms: number, zone: string): WallTime {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter(zone).formatToParts(ms)) parts[part.type] = part.value;
  const year = Number(parts.year);
  return {
    // Intl gives years before 1 AD as "BC" with a positive year; ISO year 0 is 1 BC.
    year: parts.era === "BC" || parts.era === "B" ? 1 - year : year,
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    millisecond: ((ms % 1000) + 1000) % 1000,
  };
}

function wallToUtcMs(wall: WallTime): number {
  const date = new Date(0);
  // setUTCFullYear keeps years 0–99 literal (Date.UTC maps them to 1900–1999).
  date.setUTCFullYear(wall.year, wall.month - 1, wall.day);
  date.setUTCHours(wall.hour, wall.minute, wall.second, wall.millisecond);
  return date.getTime();
}

/** Offset of `zone` from UTC at instant `ms`, in milliseconds (east positive). */
export function zoneOffsetMs(ms: number, zone: string): number {
  return wallToUtcMs(wallTimeIn(ms, zone)) - ms;
}

export type ZonedResult = {
  ms: number;
  /**
   * "gap": the time doesn't exist (clocks moved forward); the instant is the
   * same distance after the change. "overlap": the time happens twice
   * (clocks moved back); the instant is the earlier one.
   */
  adjustment: "none" | "gap" | "overlap";
};

/**
 * The instant at which the wall clock in `zone` shows `wall`, or null when it
 * is outside the range a Date can hold.
 */
export function zonedTimeToMs(wall: WallTime, zone: string): ZonedResult | null {
  const utc = wallToUtcMs(wall);
  // The ±1 day probes below must stay inside the Date range too.
  if (!Number.isFinite(utc) || Math.abs(utc) > MAX_DATE_MS - 2 * DAY) return null;
  // One DST change at most within ±1 day: try the offsets on both sides.
  const before = zoneOffsetMs(utc - DAY, zone);
  const after = zoneOffsetMs(utc + DAY, zone);
  const valid = [...new Set([before, after])]
    .map((offset) => utc - offset)
    .filter((ms) => wallToUtcMs(wallTimeIn(ms, zone)) === utc)
    .sort((a, b) => a - b);
  if (valid.length > 1) return { ms: valid[0]!, adjustment: "overlap" };
  if (valid.length === 1) return { ms: valid[0]!, adjustment: "none" };
  // In a gap, the offset from before the change moves the time forward.
  return { ms: utc - before, adjustment: "gap" };
}

/**
 * Parses an `<input type="datetime-local">` value: "YYYY-MM-DDTHH:mm" with
 * optional ":ss" and ".sss".
 */
export function parseDateTimeLocal(value: string): WallTime | null {
  const match = /^(\d{4,6})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s = "0", frac = "0"] = match;
  const wall: WallTime = {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s),
    millisecond: Number(frac.padEnd(3, "0")),
  };
  if (wall.month < 1 || wall.month > 12 || wall.hour > 23 || wall.minute > 59 || wall.second > 59)
    return null;
  const daysInMonth = new Date(Date.UTC(2000, wall.month, 0)).getUTCDate();
  const leap = wall.year % 4 === 0 && (wall.year % 100 !== 0 || wall.year % 400 === 0);
  const maxDay = wall.month === 2 ? (leap ? 29 : 28) : daysInMonth;
  if (wall.day < 1 || wall.day > maxDay) return null;
  return wall;
}

/** The `<input type="datetime-local">` value for instant `ms` in `zone`, to the second. */
export function toDateTimeLocal(ms: number, zone: string): string {
  const w = wallTimeIn(ms, zone);
  return `${padYear(w.year)}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`;
}

// ---------------------------------------------------------------------------
// Formatting

const pad = (value: number, length = 2) => String(Math.abs(value)).padStart(length, "0");

/** ISO 8601 year: 4 digits for 0–9999, otherwise signed 6 digits. */
function padYear(year: number): string {
  if (year >= 0 && year <= 9999) return pad(year, 4);
  return `${year < 0 ? "-" : "+"}${pad(year, 6)}`;
}

function formatOffset(offsetMs: number, separator: ":" | ""): string {
  const minutes = Math.round(offsetMs / MINUTE);
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}${separator}${pad(Math.abs(minutes) % 60)}`;
}

/** ISO 8601 with the zone's offset, e.g. "2023-11-14T23:13:20.000+01:00" ("Z" for UTC). */
export function formatIso(ms: number, zone = "UTC"): string {
  const w = wallTimeIn(ms, zone);
  const offset = zoneOffsetMs(ms, zone);
  const date = `${padYear(w.year)}-${pad(w.month)}-${pad(w.day)}`;
  const time = `${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}.${pad(w.millisecond, 3)}`;
  return `${date}T${time}${zone === "UTC" ? "Z" : formatOffset(offset, ":")}`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Day of the week at instant `ms` in `zone`. */
export function dayOfWeek(ms: number, zone: string): string {
  const w = wallTimeIn(ms, zone);
  // The wall time read as UTC has the same weekday.
  return DAY_NAMES[new Date(wallToUtcMs({ ...w, hour: 12 })).getUTCDay()]!;
}

/**
 * RFC 2822 date in `zone`, e.g. "Tue, 14 Nov 2023 23:13:20 +0100". Only
 * defined for years 1900 and later; returns null otherwise.
 */
export function formatRfc2822(ms: number, zone: string): string | null {
  const w = wallTimeIn(ms, zone);
  if (w.year < 1900 || w.year > 9999) return null;
  const day = dayOfWeek(ms, zone).slice(0, 3);
  const time = `${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`;
  return `${day}, ${pad(w.day)} ${MONTH_NAMES[w.month - 1]} ${w.year} ${time} ${formatOffset(zoneOffsetMs(ms, zone), "")}`;
}

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

export type DateViews = {
  isoUtc: string;
  /** ISO 8601 in the browser's zone. */
  local: string;
  /** ISO 8601 in the chosen zone. */
  zoned: string;
  rfc2822: string | null;
  relative: string;
  dayOfWeek: string;
  seconds: string;
  milliseconds: string;
};

/** Every view of instant `ms` the tool shows. `zone` is the chosen zone. */
export function dateViews(
  ms: number,
  options: { zone: string; localZone: string; now: number },
): DateViews {
  return {
    isoUtc: formatIso(ms, "UTC"),
    local: formatIso(ms, options.localZone),
    zoned: formatIso(ms, options.zone),
    rfc2822: formatRfc2822(ms, options.zone),
    relative: formatRelative(ms, options.now),
    dayOfWeek: dayOfWeek(ms, options.zone),
    seconds: String(Math.floor(ms / 1000)),
    milliseconds: String(ms),
  };
}
