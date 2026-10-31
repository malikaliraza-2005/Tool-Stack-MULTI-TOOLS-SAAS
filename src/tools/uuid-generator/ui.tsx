"use client";

import { Download, RefreshCw } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as z from "zod/mini";
import { CodeEditor } from "@/components/tool/CodeEditor";
import { ResultList, type ResultRow } from "@/components/tool/ResultList";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { downloadText } from "@/lib/files/download";
import { plural } from "@/lib/files/format";
// logic.ts is small and has no dependencies; generation needs it at once.
import { formatId, generate, inspect, MAX_QUANTITY, type IdKind } from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  kind: z.enum(["v4", "v7", "ulid"]),
  quantity: z.number(),
  uppercase: z.boolean(),
  hyphens: z.boolean(),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { kind: "v4", quantity: 1, uppercase: false, hyphens: true };

const KINDS = [
  { value: "v4", label: "UUID v4 (random)" },
  { value: "v7", label: "UUID v7 (time-ordered)" },
  { value: "ulid", label: "ULID" },
];

const KIND_NAMES: Record<IdKind, { one: string; many: string }> = {
  v4: { one: "UUID", many: "UUIDs" },
  v7: { one: "UUID", many: "UUIDs" },
  ulid: { one: "ULID", many: "ULIDs" },
};

const subscribeNever = () => () => {};
const isClient = () => true;
const isServer = () => false;

/** "250" → 250; null unless a whole number from 1 to MAX_QUANTITY. */
function parseQuantity(text: string): number | null {
  if (!/^\s*\d+\s*$/.test(text)) return null;
  const value = Number(text);
  return value >= 1 && value <= MAX_QUANTITY ? value : null;
}

export default function UuidGeneratorUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  // What is typed in "How many" while it isn't a valid quantity; otherwise
  // the field shows the stored quantity.
  const [quantityDraft, setQuantityDraft] = useState<string | null>(null);
  const [inspectText, setInspectText] = useState("");
  // Bumped by "Generate new" to make a fresh set.
  const [round, setRound] = useState(0);
  // Random values can't be in the static HTML: they are generated once the
  // page runs in the browser.
  const mounted = useSyncExternalStore(subscribeNever, isClient, isServer);

  const quantity = Math.min(Math.max(Math.trunc(options.quantity) || 1, 1), MAX_QUANTITY);
  const quantityText = quantityDraft ?? String(quantity);

  // New values whenever the type or quantity changes, or Generate is pressed.
  const ids = useMemo(
    () =>
      mounted ? { kind: options.kind, values: generate(options.kind, quantity), round } : null,
    [mounted, options.kind, quantity, round],
  );

  const quantityError =
    parseQuantity(quantityText) === null
      ? `Enter a whole number from 1 to ${MAX_QUANTITY.toLocaleString("en-US")}.`
      : undefined;
  const shown = ids?.values.map((id) => formatId(id, ids.kind, options)) ?? [];
  const names = KIND_NAMES[ids?.kind ?? options.kind];
  const all = shown.join("\n");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border [&>*+*]:border-t [&>*+*]:border-border lg:[&>*+*]:border-t-0">
      <Panel title="Generate">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Field label="Type" className="sm:grow">
            <Select
              options={KINDS}
              value={options.kind}
              onValueChange={(kind) => setOptions({ kind: kind as IdKind })}
            />
          </Field>
          <Field label="How many" error={quantityError} className="sm:w-32">
            <Input
              inputMode="numeric"
              value={quantityText}
              onChange={(event) => {
                const value = parseQuantity(event.target.value);
                if (value !== null) setOptions({ quantity: value });
                // Keep exactly what was typed (e.g. "05") until it's valid and canonical.
                setQuantityDraft(
                  value !== null && String(value) === event.target.value
                    ? null
                    : event.target.value,
                );
              }}
              className="font-mono tabular-nums"
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Switch
            label="Uppercase"
            checked={options.uppercase || options.kind === "ulid"}
            disabled={options.kind === "ulid"}
            onCheckedChange={(uppercase) => setOptions({ uppercase })}
          />
          <Switch
            label="Hyphens"
            checked={options.hyphens && options.kind !== "ulid"}
            disabled={options.kind === "ulid"}
            onCheckedChange={(hyphens) => setOptions({ hyphens })}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRound((current) => current + 1)}
            className="ml-auto"
          >
            <RefreshCw aria-hidden />
            Generate {quantity === 1 ? "new" : `${quantity.toLocaleString("en-US")} new`}
          </Button>
        </div>

        {shown.length === 1 ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-4 py-3">
            <p
              className="min-w-0 font-mono text-body-lg break-all text-fg"
              data-testid="generated-id"
            >
              {shown[0]}
            </p>
            <CopyButton value={shown[0]!} label={`Copy ${names.one}`} size="sm" />
          </div>
        ) : shown.length > 1 ? (
          <div className="flex flex-col overflow-hidden rounded-md border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5">
              <p className="text-small text-fg-muted">
                {plural(shown.length, names.one, names.many)}
              </p>
              <div className="flex items-center gap-1">
                <CopyButton value={all} label="Copy all" variant="ghost" size="sm" />
                <IconButton
                  label={`Download ${names.many.toLowerCase()}.txt`}
                  icon={<Download aria-hidden />}
                  size="sm"
                  onClick={() => downloadText(`${all}\n`, `${names.many.toLowerCase()}.txt`)}
                />
              </div>
            </div>
            <div className="h-80">
              <CodeEditor value={all} label={`Generated ${names.many}`} language="text" readOnly />
            </div>
          </div>
        ) : (
          <div className="h-14 rounded-md border border-border bg-surface-2" aria-hidden />
        )}
        {/* Announces each new batch; the values themselves aren't read out. */}
        <p role="status" className="sr-only">
          {shown.length > 0 ? `Generated ${plural(shown.length, names.one, names.many)}.` : ""}
        </p>
      </Panel>

      <Panel title="Inspect">
        <InspectSection
          value={inspectText}
          onChange={setInspectText}
          onSample={() => setInspectText("017f22e2-79b0-7cc3-98c4-dc0c0c07398f")}
        />
      </Panel>
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

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeStyle: "long",
});

function InspectSection({
  value,
  onChange,
  onSample,
}: {
  value: string;
  onChange: (value: string) => void;
  onSample: () => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  // Text typed into the static HTML before hydration fired no React event.
  const onEarlyInput = useEffectEvent(() => {
    if (field.current?.value) onChange(field.current.value);
  });
  useEffect(() => onEarlyInput(), []);

  const result = value.trim() === "" ? null : inspect(value);
  const error = result && !result.ok ? result.message : undefined;
  const info = result?.ok ? result.value : null;

  const rows: ResultRow[] = info
    ? [
        { label: "UUID", value: info.canonical },
        { label: "Version", value: info.versionName, copy: false },
        { label: "Variant", value: info.variant, copy: false },
        ...(info.timestampMs !== null
          ? [
              { label: "Created (UTC)", value: new Date(info.timestampMs).toISOString() },
              {
                label: "Created (your time zone)",
                value: dateFormat.format(info.timestampMs),
                copy: false,
              },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <Field
        label="UUID to inspect"
        description="With or without hyphens, in braces, or as urn:uuid:…"
        error={error}
      >
        <Input
          ref={field}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={meta.limits.desktop.hardBytes}
          placeholder="919108f7-52d1-4320-9bac-f847db4148a8"
          className="font-mono"
        />
      </Field>
      {/* The visible error is linked to the input; this announces it (§2.4). */}
      <span aria-live="assertive" className="sr-only">
        {error}
      </span>
      {info ? (
        <>
          <p role="status" className="sr-only">
            {info.versionName}
          </p>
          <ResultList rows={rows} />
          {info.version === 4 && (
            <p className="text-small text-fg-muted">
              Version 4 UUIDs are random and contain no timestamp.
            </p>
          )}
        </>
      ) : (
        !error && (
          <EmptyState
            title="Paste a UUID"
            description="See its version and variant, and when it was created for versions 1, 6 and 7."
            action={
              <Button size="sm" onClick={onSample}>
                Insert sample
              </Button>
            }
          />
        )
      )}
    </>
  );
}
