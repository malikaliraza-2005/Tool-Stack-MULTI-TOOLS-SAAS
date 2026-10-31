import { describe, expect, it } from "vitest";
import {
  createUlid,
  createUuidV7,
  formatId,
  generate,
  inspect,
  uuidV4,
  type Sources,
} from "./logic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

/** A fixed clock and a random source that fills bytes with a constant. */
function fixed(now: number, fill = 0xff): Sources {
  return { now: () => now, random: (bytes) => bytes.fill(fill) };
}

function inspected(text: string) {
  const result = inspect(text);
  if (!result.ok) throw new Error(`unexpected error: ${result.message}`);
  return result.value;
}

describe("generate", () => {
  it("v4 has the version and variant bits", () => {
    for (const id of generate("v4", 200)) expect(id).toMatch(V4);
    expect(uuidV4(fixed(0, 0xff))).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(uuidV4(fixed(0, 0x00))).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("v7 encodes the time and sorts in generation order", () => {
    const ids = generate("v7", 1000);
    for (const id of ids) expect(id).toMatch(V7);
    expect([...ids].sort()).toEqual(ids);
    const ms = Date.UTC(2026, 9, 31, 12);
    const id = createUuidV7(fixed(ms))();
    expect(id.slice(0, 13).replace("-", "")).toBe(ms.toString(16).padStart(12, "0"));
  });

  it("v7 keeps order within one millisecond and past counter overflow", () => {
    const next = createUuidV7(fixed(1_700_000_000_000));
    const ids = Array.from({ length: 5000 }, next);
    expect(new Set(ids).size).toBe(5000);
    expect([...ids].sort()).toEqual(ids);
    // Past 4096 values the timestamp moves ahead rather than repeating.
    expect(inspected(ids[4999]!).timestampMs).toBeGreaterThan(1_700_000_000_000);
  });

  it("v7 never goes backwards when the clock does", () => {
    let now = 2_000;
    const next = createUuidV7({ now: () => now, random: (b) => crypto.getRandomValues(b) });
    const first = next();
    now = 1_000;
    expect(next() > first).toBe(true);
  });

  it("ULIDs are 26 characters, monotonic within a millisecond", () => {
    const ids = generate("ulid", 1000);
    for (const id of ids) expect(id).toMatch(ULID);
    expect([...ids].sort()).toEqual(ids);
    // ulid/spec example: time 1469918176385 encodes as 01ARYZ6S41.
    expect(createUlid(fixed(1_469_918_176_385, 0))()).toBe("01ARYZ6S410000000000000000");
    const next = createUlid(fixed(1_469_918_176_385, 0));
    next();
    expect(next()).toBe("01ARYZ6S410000000000000001");
  });

  it("1000 values are unique, and quantity is clamped to 1–1000", () => {
    for (const kind of ["v4", "v7", "ulid"] as const) {
      expect(new Set(generate(kind, 1000)).size).toBe(1000);
    }
    expect(generate("v4", 0)).toHaveLength(1);
    expect(generate("v4", 5000)).toHaveLength(1000);
    expect(generate("v4", Number.NaN)).toHaveLength(1);
  });

  it("formats uppercase and without hyphens; ULIDs stay as they are", () => {
    const id = "0190f7a2-3b4c-7d5e-8f60-123456789abc";
    expect(formatId(id, "v7", { uppercase: true, hyphens: true })).toBe(
      "0190F7A2-3B4C-7D5E-8F60-123456789ABC",
    );
    expect(formatId(id, "v7", { uppercase: false, hyphens: false })).toBe(
      "0190f7a23b4c7d5e8f60123456789abc",
    );
    expect(
      formatId("01ARYZ6S41TSV4RRFFQ69G5FAV", "ulid", { uppercase: false, hyphens: true }),
    ).toBe("01ARYZ6S41TSV4RRFFQ69G5FAV");
    expect(generate("v4", 1)[0]).toMatch(UUID);
  });
});

describe("inspect", () => {
  it("decodes the v7 timestamp (RFC 9562 appendix A.6)", () => {
    const value = inspected("017F22E2-79B0-7CC3-98C4-DC0C0C07398F");
    expect(value).toMatchObject({
      canonical: "017f22e2-79b0-7cc3-98c4-dc0c0c07398f",
      version: 7,
      variant: "RFC 9562 (standard)",
      special: null,
    });
    expect(new Date(value.timestampMs!).toISOString()).toBe("2022-02-22T19:22:22.000Z");
  });

  it("decodes v1 and v6 timestamps (RFC 9562 appendices A.1 and A.5)", () => {
    const v1 = inspected("C232AB00-9414-11EC-B3C8-9F6BDECED846");
    const v6 = inspected("1EC9414C-232A-6B00-B3C8-9F6BDECED846");
    expect(v1.version).toBe(1);
    expect(v6.version).toBe(6);
    expect(new Date(v1.timestampMs!).toISOString()).toBe("2022-02-22T19:22:22.000Z");
    expect(v6.timestampMs).toBe(v1.timestampMs);
  });

  it("accepts braces, urn:uuid: and missing hyphens", () => {
    const canonical = "919108f7-52d1-4320-9bac-f847db4148a8";
    for (const text of [
      `{${canonical}}`,
      `urn:uuid:${canonical}`,
      canonical.replace(/-/g, ""),
      ` ${canonical.toUpperCase()} `,
    ]) {
      expect(inspected(text)).toMatchObject({ canonical, version: 4, timestampMs: null });
    }
  });

  it("recognises nil, max and non-standard variants", () => {
    expect(inspected("00000000-0000-0000-0000-000000000000").special).toBe("nil");
    expect(inspected("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF").special).toBe("max");
    const microsoft = inspected("919108f7-52d1-4320-cbac-f847db4148a8");
    expect(microsoft).toMatchObject({ version: null, versionName: "Not an RFC 9562 UUID" });
    expect(microsoft.variant).toMatch(/^Microsoft/);
  });

  it("explains invalid input", () => {
    const error = (text: string) => {
      const result = inspect(text);
      if (result.ok) throw new Error("expected an error");
      return result;
    };
    expect(error("").message).toBe("Paste a UUID to inspect.");
    expect(error("919108f7-52d1-4320-9bac-f847db4148a")).toMatchObject({ offset: null });
    expect(error("919108f7-52d1-4320-9bac-f847db4148a").message).toMatch(/^This has 31 hex digits/);
    expect(error("919108f7-52g1-4320-9bac-f847db4148a8")).toMatchObject({ offset: 11 });
    expect(error("919108f7-52g1-4320-9bac-f847db4148a8").message).toMatch(
      /^“g” isn’t a hexadecimal/,
    );
    expect(error("01ARYZ6S41TSV4RRFFQ69G5FAV").message).toMatch(/looks like a ULID/);
  });
});
