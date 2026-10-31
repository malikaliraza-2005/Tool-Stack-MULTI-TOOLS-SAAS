"use client";

import { Clock, Info, Pause, Play } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import * as z from "zod/mini";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
// logic.ts is small and has no dependencies; the clock and both conversions need it at once.
import {
  dateViews,
  formatIso,
  isValidTimeZone,
  localTimeZone,
  parseDateTimeLocal,
  parseTimestamp,
  RENAMED_ZONES,
  timeZones,
  toDateTimeLocal,
  UNIT_NAMES,
  zonedTimeToMs,
} from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  unit: z.enum(["auto", "s", "ms", "us"]),
  /** "local" or an IANA zone name. */
  zone: z.string(),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { unit: "auto", zone: "local" };

const UNITS = [
  { value: "auto", label: "Detect automatically" },
  { value: "s", label: "Seconds" },
  { value: "ms", label: "Milliseconds" },
  { value: "us", label: "Microseconds" },
];

/** Live update delay after typing (tool-specifications §2.3). */
const DEBOUNCE_MS = 150;

// The clock: re-rendered only when the second changes. The static HTML has no
// time (null), so it can't disagree with the client.
const subscribeClock = (onChange: () => void) => {
  const timer = setInterval(onChange, 250);
  return () => clearInterval(timer);
};
const currentSecond = () => Math.floor(Date.now() / 1000);
const noSecond = () => null;
const subscribeNever = () => () => {};
const noZone = () => null;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const zoneLabel = (zone: string) => zone.replaceAll("_", " ");

export default function UnixTimestampConverterUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [timestamp, setTimestamp] = useState("");
  const [dateTime, setDateTime] = useState("");
  const timestampInput = useRef<HTMLInputElement>(null);
  const dateTimeInput = useRef<HTMLInputElement>(null);

  // Text typed into the static HTML before hydration fired no React event.
  const onEarlyInput = useEffectEvent(() => {
    if (timestampInput.current?.value) setTimestamp(timestampInput.current.value);
    if (dateTimeInput.current?.value) setDateTime(dateTimeInput.current.value);
  });
  useEffect(() => onEarlyInput(), []);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  const second = useSyncExternalStore(subscribeClock, currentSecond, noSecond);
  const localZone = useSyncExternalStore(subscribeNever, localTimeZone, noZone);
  const clock = pausedAt ?? second;

  // A stored zone the browser no longer knows falls back to local.
  const zone =
    options.zone !== "local" && isValidTimeZone(options.zone) ? options.zone : (localZone ?? "UTC");

  const zoneOptions = useMemo<ComboboxOption[]>(
    () => [
      {
        value: "local",
        label: localZone ? `Local (${zoneLabel(localZone)})` : "Local time zone",
        keywords: ["local", "device", ...(localZone ? [localZone] : [])],
      },
      ...timeZones().map((value) => ({
        value,
        label: zoneLabel(value),
        // Old names stay searchable ("Calcutta" finds Asia/Kolkata).
        keywords: [
          value,
          ...Object.keys(RENAMED_ZONES).filter((old) => RENAMED_ZONES[old] === value),
        ],
      })),
    ],
    [localZone],
  );

  const liveTimestamp = useDebounced(timestamp, DEBOUNCE_MS);
  const liveDateTime = useDebounced(dateTime, DEBOUNCE_MS);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border p-3 md:px-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <p className="inline-flex items-center gap-1.5 text-small text-fg-muted">
              <Clock aria-hidden className="size-4" />
              {pausedAt === null ? "Current Unix time" : "Unix time (paused)"}
            </p>
            {/* Not a live region: screen readers must not announce every tick (§5.7). */}
            <p className="font-mono text-h2 text-fg tabular-nums" data-testid="clock">
              {clock ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPausedAt(pausedAt === null ? second : null)}
              disabled={second === null}
            >
              {pausedAt === null ? <Pause aria-hidden /> : <Play aria-hidden />}
              {pausedAt === null ? "Pause" : "Resume"}
            </Button>
            <CopyButton
              value={() => String(pausedAt ?? currentSecond())}
              label="Copy current"
              variant="ghost"
              size="sm"
              disabled={second === null}
            />
          </div>
        </div>
        <Field label="Time zone" className="w-full sm:w-72">
          <Combobox
            options={zoneOptions}
            value={options.zone === zone ? zone : "local"}
            onValueChange={(value) => setOptions({ zone: value })}
            searchPlaceholder="Search time zones…"
            emptyText="No time zone matches. Try a city, for example “Tokyo”."
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border [&>*+*]:border-t [&>*+*]:border-border lg:[&>*+*]:border-t-0">
        <Panel title="Timestamp to date">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <TimestampField
              inputRef={timestampInput}
              value={timestamp}
              live={liveTimestamp}
              unit={options.unit}
              onChange={setTimestamp}
              onNow={() => setTimestamp(String(currentSecond()))}
            />
            <Field label="Unit" className="sm:w-52">
              <Select
                options={UNITS}
                value={options.unit}
                onValueChange={(unit) => setOptions({ unit: unit as Options["unit"] })}
              />
            </Field>
          </div>
          <TimestampResult
            text={liveTimestamp}
            unit={options.unit}
            zone={zone}
            localZone={localZone ?? "UTC"}
            now={(clock ?? currentSecond()) * 1000}
            onSample={() => setTimestamp("1700000000")}
          />
        </Panel>

        <Panel title="Date to timestamp">
          <Field
            label={`Date and time (${zoneLabel(zone)})`}
            description="Read as a time in the time zone chosen above."
          >
            {/* The native date-time field needs its full width; on the narrowest
                phones "Now" wraps below it instead of clipping the value. */}
            <div className="flex flex-wrap gap-2">
              <Input
                type="datetime-local"
                step={1}
                value={dateTime}
                ref={dateTimeInput}
                onChange={(event) => setDateTime(event.target.value)}
                className="w-auto min-w-0 grow basis-60 font-mono tabular-nums"
              />
              <Button
                variant="secondary"
                onClick={() => setDateTime(toDateTimeLocal(Date.now(), zone))}
              >
                Now
              </Button>
            </div>
          </Field>
          <DateResult text={liveDateTime} zone={zone} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4 p-3 md:p-4">
      <h2 id={titleId} className="text-h3 text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Input that is still being typed: a lone sign, nothing else. */
const isIncomplete = (text: string) => /^[+-]?$/.test(text.trim());

function TimestampField({
  inputRef,
  value,
  live,
  unit,
  onChange,
  onNow,
}: {
  value: string;
  live: string;
  unit: Options["unit"];
  onChange: (value: string) => void;
  onNow: () => void;
  inputRef: Ref<HTMLInputElement>;
}) {
  const parsed = isIncomplete(live) ? null : parseTimestamp(live, unit);
  const error = parsed && !parsed.ok ? parsed.error.message : null;
  const detected =
    parsed?.ok && parsed.value.detected
      ? `Read as ${UNIT_NAMES[parsed.value.unit]} (${parsed.value.digits} digits).`
      : undefined;
  return (
    <Field label="Unix timestamp" description={detected} error={error} className="min-w-0 grow">
      <div className="flex gap-2">
        <Input
          value={value}
          ref={inputRef}
          onChange={(event) => onChange(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={meta.limits.desktop.hardBytes}
          placeholder="1700000000"
          className="min-w-0 font-mono tabular-nums"
        />
        <Button variant="secondary" onClick={onNow}>
          Now
        </Button>
      </div>
      {/* The visible error is linked to the input; this announces it (§2.4). */}
      <span aria-live="assertive" className="sr-only">
        {error}
      </span>
    </Field>
  );
}

function TimestampResult({
  text,
  unit,
  zone,
  localZone,
  now,
  onSample,
}: {
  text: string;
  unit: Options["unit"];
  zone: string;
  localZone: string;
  now: number;
  onSample: () => void;
}) {
  if (isIncomplete(text)) {
    return (
      <EmptyState
        title="Enter a timestamp"
        description="Paste a Unix timestamp in seconds, milliseconds or microseconds, or select Now."
        action={
          <Button size="sm" onClick={onSample}>
            Insert sample
          </Button>
        }
      />
    );
  }
  const parsed = parseTimestamp(text, unit);
  if (!parsed.ok) return null;
  const { ms, extraMicros, unit: used } = parsed.value;
  const views = dateViews(ms, { zone, localZone, now });
  const micros =
    used === "us" ? `${views.isoUtc.slice(0, -1)}${String(extraMicros).padStart(3, "0")}Z` : null;
  const rows: Row[] = [
    { label: "UTC (ISO 8601)", value: micros ?? views.isoUtc },
    { label: `Local: ${zoneLabel(localZone)}`, value: views.local },
    ...(zone !== localZone && zone !== "UTC"
      ? [{ label: zoneLabel(zone), value: views.zoned }]
      : []),
    ...(views.rfc2822 ? [{ label: "RFC 2822", value: views.rfc2822 }] : []),
    { label: "Relative", value: views.relative, copy: false },
    { label: `Day of the week (${zoneLabel(zone)})`, value: views.dayOfWeek, copy: false },
    { label: "Seconds", value: views.seconds },
    { label: "Milliseconds", value: views.milliseconds },
  ];
  return (
    <>
      <p role="status" className="sr-only">
        {`${views.isoUtc} (${UNIT_NAMES[used]})`}
      </p>
      <ResultRows rows={rows} />
    </>
  );
}

function DateResult({ text, zone }: { text: string; zone: string }) {
  if (text === "") {
    return (
      <EmptyState
        title="Pick a date and time"
        description="Choose a date and time, or select Now. Its Unix timestamp appears here."
      />
    );
  }
  const wall = parseDateTimeLocal(text);
  const result = wall && zonedTimeToMs(wall, zone);
  if (!result) {
    return (
      <p role="alert" className="text-small text-danger">
        Enter a complete date and time. Years can range from 0 to 275,759.
      </p>
    );
  }
  const { ms, adjustment } = result;
  const shown = formatIso(ms, zone);
  // "…T03:30:00.000+02:00" → time "03:30:00", offset "+02:00".
  const [, time, offset] = /T(\d{2}:\d{2}:\d{2})\.\d{3}(.*)$/.exec(shown) ?? [];
  const rows: Row[] = [
    { label: "Unix timestamp (seconds)", value: String(Math.floor(ms / 1000)) },
    { label: "Milliseconds", value: String(ms) },
    { label: "UTC (ISO 8601)", value: formatIso(ms) },
    ...(zone === "UTC" ? [] : [{ label: zoneLabel(zone), value: shown }]),
  ];
  return (
    <>
      <p role="status" className="sr-only">
        {`${Math.floor(ms / 1000)} seconds`}
      </p>
      {adjustment !== "none" && (
        <p className="flex items-start gap-2 rounded-md border border-warning bg-warning-soft p-3 text-small text-fg">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            {adjustment === "gap"
              ? `This time doesn’t exist in ${zoneLabel(zone)}: clocks moved forward that day. It’s converted as ${time}, the same distance after the change.`
              : `This time happens twice in ${zoneLabel(zone)}: clocks moved back that day. It’s converted as the first occurrence (UTC${offset}).`}
          </span>
        </p>
      )}
      <ResultRows rows={rows} />
    </>
  );
}

type Row = { label: string; value: string; copy?: boolean };

function ResultRows({ rows }: { rows: Row[] }) {
  return (
    <dl className="flex flex-col divide-y divide-border rounded-md border border-border">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col px-3 py-2">
          <dt className="text-small text-fg-muted">{row.label}</dt>
          {/* The copy button lives in the <dd>: a <dl> row may hold only dt and dd. */}
          <dd className="flex min-h-8 items-center justify-between gap-3">
            <span className="min-w-0 font-mono text-code break-all text-fg tabular-nums">
              {row.value}
            </span>
            {row.copy !== false && (
              <CopyButton
                value={row.value}
                label={`Copy ${row.label}`}
                iconOnly
                variant="ghost"
                size="sm"
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
