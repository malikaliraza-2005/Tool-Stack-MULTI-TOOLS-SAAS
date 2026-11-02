import type { ToolDefinition } from "../types";

const KB = 2 ** 10;

export const meta: ToolDefinition = {
  slug: "unix-timestamp-converter",
  category: "developer",
  status: "live",
  name: "Unix Timestamp Converter",
  tagline:
    "Convert Unix timestamps to dates and dates to timestamps, in any time zone. Seconds, milliseconds and microseconds are detected for you.",
  icon: "clock",
  keywords: [
    "epoch converter",
    "timestamp converter",
    "unix time",
    "epoch time",
    "current unix timestamp",
    "timestamp to date",
    "date to timestamp",
    "milliseconds to date",
  ],
  seo: {
    title: "Unix Timestamp Converter (Epoch Converter) | Sprigkit",
    description:
      "Convert Unix timestamps to dates and back in any time zone. Detects seconds, milliseconds and microseconds, and shows the current Unix time live.",
    h1: "Unix timestamp converter (epoch converter)",
    faqs: [
      {
        q: "What is the current Unix timestamp?",
        a: "It’s shown live at the top of the tool and updates every second. Select “Copy current” to copy it, or “Pause” to stop it on a value. A Unix timestamp counts the seconds since 1 January 1970 at 00:00:00 UTC, so it is the same everywhere in the world at a given moment.",
      },
      {
        q: "Seconds or milliseconds: how can I tell?",
        a: "Count the digits. Today’s dates are 10 digits in seconds (used by Unix, PHP and most APIs), 13 digits in milliseconds (JavaScript’s Date.now(), Java) and 16 digits in microseconds (common in databases and tracing tools). The converter detects the unit from the digit count and tells you what it chose; you can set the unit yourself if the guess is wrong.",
      },
      {
        q: "How do I convert a timestamp to my time zone?",
        a: "Paste the timestamp. The result shows the date in UTC, in your device’s time zone and in the time zone you choose at the top, each with its UTC offset. Daylight saving time is taken into account for the date shown.",
      },
      {
        q: "How do I convert a date to a Unix timestamp?",
        a: "Pick a date and time under “Date to timestamp” and choose the time zone it is in. You get the timestamp in seconds and milliseconds. If the time doesn’t exist on that day because clocks moved forward, or happens twice because they moved back, the tool tells you which moment it used.",
      },
      {
        q: "What is the year 2038 problem?",
        a: "Systems that store Unix time as a signed 32-bit number can count only up to 2,147,483,647, which is 19 January 2038 at 03:14:07 UTC. One second later the value overflows and wraps to a date in 1901. Modern systems use 64-bit numbers, which last far beyond that. This converter isn’t affected: it handles any date JavaScript can represent.",
      },
      {
        q: "Is anything I enter sent anywhere?",
        a: "No. Conversion runs in your browser using its built-in time zone data. Nothing you enter is uploaded, stored or put in the URL. Only your unit and time zone choices are remembered on this device.",
      },
    ],
  },
  related: ["jwt-decoder", "uuid-generator", "json-formatter", "base64-encode-decode"],
  input: { kind: "text", detect: ["unix-timestamp"] },
  limits: {
    desktop: { softBytes: 1 * KB, hardBytes: 64 * KB },
    mobile: { softBytes: 1 * KB, hardBytes: 64 * KB },
  },
  processing: { local: true, worker: false, offline: true },
  addedAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
