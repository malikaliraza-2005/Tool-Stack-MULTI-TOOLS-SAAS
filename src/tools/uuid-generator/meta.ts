import type { ToolDefinition } from "../types";

const KB = 2 ** 10;

export const meta: ToolDefinition = {
  slug: "uuid-generator",
  category: "developer",
  status: "live",
  name: "UUID Generator",
  tagline:
    "Generate UUID v4, sortable UUID v7 and ULIDs, up to 1,000 at a time, or inspect a UUID’s version and timestamp.",
  icon: "fingerprint",
  keywords: [
    "guid generator",
    "uuid v4",
    "uuid v7",
    "random uuid",
    "bulk uuid",
    "ulid generator",
    "uuid validator",
    "uuid decoder",
  ],
  seo: {
    title: "UUID Generator: v4, v7 and ULID, Bulk (GUID) | Sprigkit",
    description:
      "Generate random UUID v4, time-ordered UUID v7 and ULIDs in bulk, uppercase or without hyphens. Inspect any UUID’s version and timestamp.",
    h1: "UUID generator (GUID)",
    faqs: [
      {
        q: "What is the difference between UUID v4 and v7?",
        a: "UUID v4 is 122 random bits: unpredictable, with no order. UUID v7 starts with the time in milliseconds, followed by random bits, so values sort in the order they were created. That makes v7 a better database key: new rows go to the end of the index instead of random places. Use v4 when the id must not reveal when it was made.",
      },
      {
        q: "Is a GUID the same as a UUID?",
        a: "Yes. GUID (globally unique identifier) is Microsoft’s name for a UUID. The format is the same 128-bit, 32-hex-digit value, often written in braces in Windows tools, for example {919108f7-52d1-4320-9bac-f847db4148a8}. Choose Uppercase if your system expects GUIDs in capitals.",
      },
      {
        q: "Are the generated UUIDs random and unique?",
        a: "They come from your browser’s cryptographic random number generator (crypto.getRandomValues), the same source used for encryption keys. With 122 random bits, the chance of two v4 UUIDs colliding is negligible even across billions of values. Nothing is generated on or sent to a server.",
      },
      {
        q: "Can I generate UUIDs in bulk or without hyphens?",
        a: "Yes. Set the quantity up to 1,000 and copy them all or download them as a .txt file, one per line. Options give uppercase letters or the 32-digit form without hyphens.",
      },
      {
        q: "What is a ULID?",
        a: "A ULID is a 128-bit id like a UUID, written as 26 characters in Crockford’s Base32 (for example 01ARYZ6S41TSV4RRFFQ69G5FAV). It starts with a millisecond timestamp, so ULIDs sort by creation time, like UUID v7. Choose UUID v7 when your database has a UUID type, and ULID when you want shorter text ids.",
      },
      {
        q: "How do I find out when a UUID was created?",
        a: "Paste it under Inspect. For versions 1, 6 and 7, which contain a timestamp, you see the date and time it was created. Version 4 UUIDs are random and contain no time.",
      },
    ],
  },
  related: ["hash-generator", "unix-timestamp-converter", "base64-encode-decode", "json-formatter"],
  input: { kind: "text", detect: ["uuid"] },
  limits: {
    desktop: { softBytes: 1 * KB, hardBytes: 64 * KB },
    mobile: { softBytes: 1 * KB, hardBytes: 64 * KB },
  },
  processing: { local: true, worker: false, offline: true },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
