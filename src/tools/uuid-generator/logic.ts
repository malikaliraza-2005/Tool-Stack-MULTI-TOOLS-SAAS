// UUID and ULID generation and inspection (tool-specifications §5.8, RFC 9562).
// Pure functions apart from the random source (crypto.getRandomValues) and
// the clock, both injectable for tests.

export type IdKind = "v4" | "v7" | "ulid";

export type Sources = {
  now: () => number;
  random: (bytes: Uint8Array) => Uint8Array;
};

const defaultSources: Sources = {
  now: () => Date.now(),
  random: (bytes) => crypto.getRandomValues(bytes),
};

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

/** 16 bytes → "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" (lowercase). */
export function formatUuid(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += HEX[bytes[i]!];
    if (i === 3 || i === 5 || i === 7 || i === 9) out += "-";
  }
  return out;
}

/** UUID v4: 122 random bits (RFC 9562 §5.4). */
export function uuidV4(sources: Sources = defaultSources): string {
  const bytes = sources.random(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return formatUuid(bytes);
}

/**
 * UUID v7 generator (RFC 9562 §5.7): 48-bit Unix milliseconds, then rand_a
 * used as a 12-bit counter (§6.2 method 1) so values made in the same
 * millisecond still sort in order. The counter starts at a random value in
 * its lower half; when it overflows, the timestamp moves 1 ms ahead.
 */
export function createUuidV7(sources: Sources = defaultSources): () => string {
  let lastMs = -1;
  let counter = 0;
  return () => {
    let ms = Math.max(sources.now(), lastMs);
    if (ms === lastMs) {
      counter++;
      if (counter > 0xfff) {
        ms++;
        counter = randomCounter(sources);
      }
    } else {
      counter = randomCounter(sources);
    }
    lastMs = ms;
    const bytes = sources.random(new Uint8Array(16));
    // 48-bit big-endian timestamp (exact: integers up to 2^53 divide cleanly).
    let rest = ms;
    for (let i = 5; i >= 0; i--) {
      bytes[i] = rest % 256;
      rest = Math.floor(rest / 256);
    }
    bytes[6] = 0x70 | (counter >> 8);
    bytes[7] = counter & 0xff;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    return formatUuid(bytes);
  };
}

function randomCounter(sources: Sources): number {
  const [high = 0, low = 0] = sources.random(new Uint8Array(2));
  // Lower half (0–2047), leaving room to count up within a millisecond.
  return ((high << 8) | low) & 0x7ff;
}

// Crockford's Base32, as used by ULID.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * ULID generator (ulid/spec): 48-bit Unix milliseconds as 10 characters, then
 * 80 random bits as 16. Within one millisecond the random part is
 * incremented (monotonic), so a batch sorts in order.
 */
export function createUlid(sources: Sources = defaultSources): () => string {
  let lastMs = -1;
  let random: number[] = [];
  return () => {
    const ms = Math.max(sources.now(), lastMs);
    if (ms === lastMs && increment(random)) {
      // Incremented in place.
    } else {
      const bytes = sources.random(new Uint8Array(16));
      random = Array.from({ length: 16 }, (_, i) => bytes[i]! & 31);
    }
    lastMs = ms;
    let time = "";
    let rest = ms;
    for (let i = 0; i < 10; i++) {
      time = CROCKFORD[rest % 32] + time;
      rest = Math.floor(rest / 32);
    }
    return time + random.map((digit) => CROCKFORD[digit]).join("");
  };
}

/** Adds 1 to base-32 digits; false when they overflow. */
function increment(digits: number[]): boolean {
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i]! < 31) {
      digits[i]!++;
      return true;
    }
    digits[i] = 0;
  }
  return false;
}

export const MAX_QUANTITY = 1000;

/** `quantity` new ids of one kind, in generation order. */
export function generate(
  kind: IdKind,
  quantity: number,
  sources: Sources = defaultSources,
): string[] {
  const count = Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_QUANTITY);
  const next =
    kind === "v4"
      ? () => uuidV4(sources)
      : kind === "v7"
        ? createUuidV7(sources)
        : createUlid(sources);
  return Array.from({ length: count }, next);
}

export type FormatOptions = { uppercase: boolean; hyphens: boolean };

/** Display form of a generated id. ULIDs are always uppercase without hyphens. */
export function formatId(id: string, kind: IdKind, options: FormatOptions): string {
  if (kind === "ulid") return id;
  const plain = options.hyphens ? id : id.replace(/-/g, "");
  return options.uppercase ? plain.toUpperCase() : plain;
}

// ---------------------------------------------------------------------------
// Inspect

export type Inspection = {
  /** Lowercase, hyphenated. */
  canonical: string;
  /** 1–8, or null for the nil and max UUIDs. */
  version: number | null;
  versionName: string;
  variant: string;
  /** Unix milliseconds embedded in v1, v6 and v7 UUIDs. */
  timestampMs: number | null;
  /** "nil" or "max" for the special UUIDs. */
  special: "nil" | "max" | null;
};

export type InspectResult =
  { ok: true; value: Inspection } | { ok: false; message: string; offset: number | null };

const VERSION_NAMES: Record<number, string> = {
  1: "Version 1 (time and node)",
  2: "Version 2 (DCE security)",
  3: "Version 3 (MD5 name-based)",
  4: "Version 4 (random)",
  5: "Version 5 (SHA-1 name-based)",
  6: "Version 6 (reordered time)",
  7: "Version 7 (Unix time, sortable)",
  8: "Version 8 (custom)",
};

// 100-ns intervals between the Gregorian epoch (1582-10-15) and 1970-01-01.
const GREGORIAN_OFFSET = 0x01b21dd213814000n;

/**
 * Inspects a UUID written with or without hyphens, in braces, or as
 * urn:uuid:…. Explains what is wrong with anything else.
 */
export function inspect(text: string): InspectResult {
  const trimmed = text.trim();
  const leading = text.length - text.trimStart().length;
  if (trimmed === "") return { ok: false, message: "Paste a UUID to inspect.", offset: null };

  let body = trimmed;
  let skip = leading;
  const urn = /^urn:uuid:/i.exec(body);
  if (urn) {
    body = body.slice(urn[0].length);
    skip += urn[0].length;
  }
  if (body.startsWith("{") && body.endsWith("}")) {
    body = body.slice(1, -1);
    skip += 1;
  }

  let hex = "";
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (char === "-") continue;
    if (!/[0-9a-f]/i.test(char)) {
      const isUlid = /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(body);
      return {
        ok: false,
        message: isUlid
          ? "This looks like a ULID (26 characters, Crockford Base32), not a UUID. ULIDs encode their time in the first 10 characters."
          : `“${char}” isn’t a hexadecimal digit. A UUID contains only 0–9 and a–f, usually as 8-4-4-4-12 groups separated by hyphens.`,
        offset: isUlid ? null : skip + i,
      };
    }
    hex += char.toLowerCase();
  }
  if (hex.length !== 32) {
    return {
      ok: false,
      message: `This has ${hex.length} hex digits; a UUID has exactly 32 (8-4-4-4-12). Check that it was copied in full.`,
      offset: null,
    };
  }

  const canonical = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  if (/^0+$/.test(hex)) {
    return {
      ok: true,
      value: {
        canonical,
        version: null,
        versionName: "Nil UUID",
        variant: "None (all bits 0)",
        timestampMs: null,
        special: "nil",
      },
    };
  }
  if (/^f+$/.test(hex)) {
    return {
      ok: true,
      value: {
        canonical,
        version: null,
        versionName: "Max UUID",
        variant: "None (all bits 1)",
        timestampMs: null,
        special: "max",
      },
    };
  }

  const version = parseInt(hex[12]!, 16);
  const variantBits = parseInt(hex[16]!, 16);
  const variant =
    variantBits < 8
      ? "NCS (reserved, backward compatibility)"
      : variantBits < 12
        ? "RFC 9562 (standard)"
        : variantBits < 14
          ? "Microsoft (reserved, backward compatibility)"
          : "Reserved for future definition";
  const standard = variantBits >= 8 && variantBits < 12;

  let timestampMs: number | null = null;
  if (standard && version === 7) {
    timestampMs = parseInt(hex.slice(0, 12), 16);
  } else if (standard && (version === 1 || version === 6)) {
    // v1: time_low (8) time_mid (4) time_hi (3 after the version digit); v6 is in order.
    const ticks =
      version === 1
        ? BigInt(`0x${hex.slice(13, 16)}${hex.slice(8, 12)}${hex.slice(0, 8)}`)
        : BigInt(`0x${hex.slice(0, 8)}${hex.slice(8, 12)}${hex.slice(13, 16)}`);
    timestampMs = Number((ticks - GREGORIAN_OFFSET) / 10000n);
  }

  return {
    ok: true,
    value: {
      canonical,
      version: standard ? version : null,
      versionName: standard
        ? (VERSION_NAMES[version] ?? `Version ${version} (not defined by RFC 9562)`)
        : "Not an RFC 9562 UUID",
      variant,
      timestampMs,
      special: null,
    },
  };
}
