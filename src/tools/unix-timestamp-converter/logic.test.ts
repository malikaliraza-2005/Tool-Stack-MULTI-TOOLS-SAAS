import { describe, expect, it } from "vitest";
import {
  currentZoneName,
  dateViews,
  dayOfWeek,
  detectUnit,
  formatIso,
  formatRelative,
  formatRfc2822,
  isValidTimeZone,
  parseDateTimeLocal,
  parseTimestamp,
  timeZones,
  toDateTimeLocal,
  zonedTimeToMs,
  zoneOffsetMs,
  type WallTime,
} from "./logic";

const BERLIN = "Europe/Berlin";
const NEW_YORK = "America/New_York";
const HOUR = 3_600_000;

function parsed(text: string, unit?: Parameters<typeof parseTimestamp>[1]) {
  const result = parseTimestamp(text, unit);
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result.value;
}

function errorOf(text: string, unit?: Parameters<typeof parseTimestamp>[1]) {
  const result = parseTimestamp(text, unit);
  if (result.ok) throw new Error("expected an error");
  expect(result.error.code).toBe("E_INVALID_INPUT");
  return result.error.message;
}

const wall = (text: string): WallTime => {
  const value = parseDateTimeLocal(text);
  if (!value) throw new Error(`invalid wall time ${text}`);
  return value;
};

describe("unit detection", () => {
  it("detects the unit from the digit count", () => {
    expect(parsed("1700000000")).toMatchObject({
      ms: 1_700_000_000_000,
      unit: "s",
      detected: true,
    });
    expect(parsed("1700000000123")).toMatchObject({ ms: 1_700_000_000_123, unit: "ms" });
    expect(parsed("1700000000123456")).toMatchObject({
      ms: 1_700_000_000_123,
      unit: "us",
      extraMicros: 456,
    });
    expect([1, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(detectUnit)).toEqual([
      "s",
      "s",
      "s",
      "s",
      "ms",
      "ms",
      "ms",
      "us",
      "us",
      "us",
      null,
    ]);
  });

  it("a manual unit overrides detection", () => {
    expect(parsed("1700000000", "ms")).toMatchObject({ ms: 1_700_000_000, detected: false });
    expect(parsed("1700000000000", "s")).toMatchObject({ ms: 1_700_000_000_000_000 });
    expect(parsed("1700000000", "us").ms).toBe(1_700_000);
  });

  it("ignores spaces, separators and leading zeros", () => {
    expect(parsed("  1 700 000 000\n").ms).toBe(1_700_000_000_000);
    expect(parsed("1_700_000_000").ms).toBe(1_700_000_000_000);
    expect(parsed("1,700,000,000").ms).toBe(1_700_000_000_000);
    expect(parsed("+1700000000").ms).toBe(1_700_000_000_000);
    expect(parsed("0001700000000").unit).toBe("s");
    expect(parsed("0").ms).toBe(0);
  });

  it("negative timestamps are dates before 1970", () => {
    expect(formatIso(parsed("-1").ms)).toBe("1969-12-31T23:59:59.000Z");
    expect(formatIso(parsed("-86400").ms)).toBe("1969-12-31T00:00:00.000Z");
    expect(formatIso(parsed("-2208988800").ms)).toBe("1900-01-01T00:00:00.000Z");
    // Microseconds floor toward the earlier millisecond.
    expect(parsed("-1", "us")).toMatchObject({ ms: -1, extraMicros: 999 });
    expect(parsed("-1500", "us")).toMatchObject({ ms: -2, extraMicros: 500 });
  });

  it("explains invalid input", () => {
    expect(errorOf("")).toMatch(/^Enter a Unix timestamp/);
    expect(errorOf("   ")).toMatch(/^Enter a Unix timestamp/);
    expect(errorOf("1700000000.5")).toMatch(/^Enter a whole number/);
    expect(errorOf("abc")).toMatch(/only digits/);
    expect(errorOf("2023-11-14")).toMatch(/only digits/);
    expect(errorOf("12345678901234567890")).toMatch(/^20 digits is too long/);
    expect(errorOf("99999999999999999", "s")).toMatch(/out of range as seconds.*Check the unit/);
    expect(errorOf("8640000000000001", "ms")).toMatch(/out of range as milliseconds/);
    expect(parsed("8640000000000000", "ms").ms).toBe(8.64e15);
  });
});

describe("timestamp → date", () => {
  const ms = 1_700_000_000_000;

  it("formats ISO 8601 in UTC and two zones", () => {
    expect(formatIso(ms)).toBe("2023-11-14T22:13:20.000Z");
    expect(formatIso(ms, BERLIN)).toBe("2023-11-14T23:13:20.000+01:00");
    expect(formatIso(ms, NEW_YORK)).toBe("2023-11-14T17:13:20.000-05:00");
    expect(formatIso(ms, "Asia/Kolkata")).toBe("2023-11-15T03:43:20.000+05:30");
    expect(formatIso(ms, "Asia/Kathmandu")).toBe("2023-11-15T03:58:20.000+05:45");
  });

  it("matches Date#toISOString across the whole range", () => {
    for (const value of [0, -1, 1, 951_782_400_000, -62_167_219_200_000, 8.64e15, -8.64e15]) {
      expect(formatIso(value)).toBe(new Date(value).toISOString());
    }
  });

  it("formats RFC 2822 and the day of the week in the chosen zone", () => {
    expect(formatRfc2822(ms, "UTC")).toBe("Tue, 14 Nov 2023 22:13:20 +0000");
    expect(formatRfc2822(ms, BERLIN)).toBe("Tue, 14 Nov 2023 23:13:20 +0100");
    expect(formatRfc2822(ms, "Pacific/Kiritimati")).toBe("Wed, 15 Nov 2023 12:13:20 +1400");
    expect(formatRfc2822(-2_208_988_801_000, "UTC")).toBeNull();
    expect(dayOfWeek(ms, "UTC")).toBe("Tuesday");
    expect(dayOfWeek(ms, "Pacific/Kiritimati")).toBe("Wednesday");
    expect(dayOfWeek(-86_400_000, "UTC")).toBe("Wednesday");
  });

  it("follows DST: the same zone at either side of a change", () => {
    // New York moved to EDT at 2024-03-10 07:00 UTC.
    const change = Date.UTC(2024, 2, 10, 7);
    expect(formatIso(change - 1000, NEW_YORK)).toBe("2024-03-10T01:59:59.000-05:00");
    expect(formatIso(change, NEW_YORK)).toBe("2024-03-10T03:00:00.000-04:00");
    expect(zoneOffsetMs(change - 1, NEW_YORK)).toBe(-5 * HOUR);
    expect(zoneOffsetMs(change, NEW_YORK)).toBe(-4 * HOUR);
  });

  it("formats relative time with the largest whole unit", () => {
    const now = ms;
    expect(formatRelative(now, now)).toBe("now");
    expect(formatRelative(now - 30_000, now)).toBe("30 seconds ago");
    expect(formatRelative(now - 3 * HOUR - 59_000, now)).toBe("3 hours ago");
    expect(formatRelative(now - 24 * HOUR, now)).toBe("yesterday");
    expect(formatRelative(now + 2 * 366 * 24 * HOUR, now)).toBe("in 2 years");
    expect(formatRelative(now - 3 * 7 * 24 * HOUR, now)).toBe("3 weeks ago");
  });

  it("builds every view", () => {
    expect(dateViews(ms, { zone: BERLIN, localZone: NEW_YORK, now: ms + HOUR })).toEqual({
      isoUtc: "2023-11-14T22:13:20.000Z",
      local: "2023-11-14T17:13:20.000-05:00",
      zoned: "2023-11-14T23:13:20.000+01:00",
      rfc2822: "Tue, 14 Nov 2023 23:13:20 +0100",
      relative: "1 hour ago",
      dayOfWeek: "Tuesday",
      seconds: "1700000000",
      milliseconds: "1700000000000",
    });
    expect(dateViews(-1, { zone: "UTC", localZone: "UTC", now: 0 }).seconds).toBe("-1");
  });
});

describe("date → timestamp", () => {
  it("converts a wall time in UTC and two zones", () => {
    const value = wall("2023-11-14T22:13:20");
    expect(zonedTimeToMs(value, "UTC")).toEqual({ ms: 1_700_000_000_000, adjustment: "none" });
    expect(zonedTimeToMs(wall("2023-11-14T23:13:20"), BERLIN)?.ms).toBe(1_700_000_000_000);
    expect(zonedTimeToMs(wall("2023-11-14T17:13:20"), NEW_YORK)?.ms).toBe(1_700_000_000_000);
    expect(zonedTimeToMs(wall("1969-12-31T23:59:59"), "UTC")?.ms).toBe(-1000);
    expect(zonedTimeToMs(wall("0050-06-01T00:00"), "UTC")?.ms).toBe(
      Date.parse("0050-06-01T00:00Z"),
    );
    expect(zonedTimeToMs(wall("275760-09-13T00:00"), "UTC")).toBeNull();
  });

  it("a time skipped by DST moves forward by the gap", () => {
    // Berlin skipped 02:00–03:00 on 2024-03-31; 02:30 is shown as 03:30 CEST.
    expect(zonedTimeToMs(wall("2024-03-31T02:30"), BERLIN)).toEqual({
      ms: Date.UTC(2024, 2, 31, 1, 30),
      adjustment: "gap",
    });
    expect(zonedTimeToMs(wall("2024-03-31T03:00"), BERLIN)).toEqual({
      ms: Date.UTC(2024, 2, 31, 1),
      adjustment: "none",
    });
  });

  it("a time repeated by DST resolves to the earlier instant", () => {
    // Berlin repeated 02:00–03:00 on 2024-10-27: 02:30 CEST, then 02:30 CET.
    expect(zonedTimeToMs(wall("2024-10-27T02:30"), BERLIN)).toEqual({
      ms: Date.UTC(2024, 9, 27, 0, 30),
      adjustment: "overlap",
    });
    expect(zonedTimeToMs(wall("2024-11-03T01:30"), NEW_YORK)).toEqual({
      ms: Date.UTC(2024, 10, 3, 5, 30),
      adjustment: "overlap",
    });
  });

  it("parses datetime-local values", () => {
    expect(parseDateTimeLocal("2024-02-29T23:59")).toEqual({
      year: 2024,
      month: 2,
      day: 29,
      hour: 23,
      minute: 59,
      second: 0,
      millisecond: 0,
    });
    expect(parseDateTimeLocal("2024-02-29T23:59:58.5")?.millisecond).toBe(500);
    for (const bad of [
      "",
      "2023-02-29T00:00",
      "2024-13-01T00:00",
      "2024-04-31T00:00",
      "2024-01-01",
    ]) {
      expect(parseDateTimeLocal(bad)).toBeNull();
    }
  });

  it("round-trips through the datetime-local value", () => {
    const ms = 1_700_000_000_000;
    expect(toDateTimeLocal(ms, BERLIN)).toBe("2023-11-14T23:13:20");
    expect(zonedTimeToMs(wall(toDateTimeLocal(ms, NEW_YORK)), NEW_YORK)?.ms).toBe(ms);
  });
});

describe("time zones", () => {
  it("lists UTC first, without duplicates", () => {
    const zones = timeZones();
    expect(zones[0]).toBe("UTC");
    expect(zones).toContain(BERLIN);
    expect(new Set(zones).size).toBe(zones.length);
  });

  it("uses current names for renamed zones", () => {
    const zones = timeZones();
    expect(zones).toContain("Asia/Kolkata");
    expect(zones).toContain("Europe/Kyiv");
    expect(zones).not.toContain("Asia/Calcutta");
    expect(currentZoneName("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(currentZoneName("Europe/Berlin")).toBe("Europe/Berlin");
  });

  it("validates zone names", () => {
    expect(isValidTimeZone(NEW_YORK)).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
  });
});
