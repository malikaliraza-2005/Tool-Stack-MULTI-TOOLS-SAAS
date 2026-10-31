"use client";

import { Download, Eraser, Info, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as z from "zod/mini";
import { CodeEditor } from "@/components/tool/CodeEditor";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { ToolbarGroup, Workbench, WorkbenchPane } from "@/components/tool/Workbench";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toToolError, type ToolError } from "@/lib/errors";
import { downloadText } from "@/lib/files/download";
import { plural } from "@/lib/files/format";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
// The explanation only reads the pattern (never runs it): safe on the page.
import { explain } from "./explain";
// Types only: patterns run in the worker, never on the page.
import { FLAGS, type Flag, type Match, type RegexJob, type RegexJobResult } from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  flags: z.string(),
  mode: z.enum(["match", "replace"]),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { flags: "g", mode: "match" };

const MODES = [
  { value: "match", label: "Match" },
  { value: "replace", label: "Replace" },
];

const FLAG_NAMES: Record<Flag, string> = {
  g: "global",
  i: "ignore case",
  m: "multiline",
  s: "dot matches newline",
  u: "unicode",
  v: "unicode sets",
  y: "sticky",
  d: "indices",
};

/** §5.6: the worker is killed after this long. */
const TIMEOUT_MS = 1000;
const TIMEOUT_MESSAGE =
  "This pattern took too long (possible catastrophic backtracking). Try making quantifiers more specific.";
/** Live update delay after typing (tool-specifications §2.3). */
const DEBOUNCE_MS = 150;
/** Matches listed on the page (all are counted and highlighted up to the worker's cap). */
const LIST_LIMIT = 200;
/** Text highlighted on the page at most; longer text is cut, with a note. */
const HIGHLIGHT_LIMIT = 200_000;

const SAMPLE = {
  pattern: String.raw`(?<user>[\w.+-]+)@(?<domain>[\w-]+(?:\.[\w-]+)+)`,
  text: "Contact ada@example.com or grace.hopper@navy.mil.\nInvalid: alan@ or @turing.",
  replacement: "$<user> at $<domain>",
};

type Outcome =
  | { status: "empty" }
  | { status: "done"; result: Extract<RegexJobResult, { ok: true }>; job: RegexJob }
  | { status: "invalid"; message: string }
  | { status: "failed"; error: ToolError };

export default function RegexTesterUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  // Pattern, text and replacement are content: in memory only (§2.3).
  const [pattern, setPattern] = useState("");
  const [text, setText] = useState("");
  const [replacement, setReplacement] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ status: "empty" });
  const runner = useRef<WorkerRunner<RegexJob, RegexJobResult> | null>(null);
  const sequence = useRef(0);

  const flags = FLAGS.filter((flag) => options.flags.includes(flag)).join("");
  const replacing = options.mode === "replace";

  useEffect(() => () => runner.current?.dispose(), []);

  // Every run goes to the dedicated worker with a 1 s limit; a timeout kills
  // the worker and the next run starts a fresh one.
  useEffect(() => {
    const id = ++sequence.current;
    if (pattern === "") return;
    const job: RegexJob = { pattern, flags, text, replacement: replacing ? replacement : null };
    const timer = setTimeout(async () => {
      runner.current ??= createWorkerRunner<RegexJob, RegexJobResult>(
        () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
      );
      try {
        const result = await runner.current.run(job, {
          timeoutMs: TIMEOUT_MS,
          timeoutMessage: TIMEOUT_MESSAGE,
        });
        if (id !== sequence.current) return;
        setOutcome(
          result.ok
            ? { status: "done", result, job }
            : { status: "invalid", message: result.message },
        );
      } catch (error) {
        if (id !== sequence.current) return;
        setOutcome({ status: "failed", error: toToolError(error, "testing the pattern") });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pattern, flags, text, replacement, replacing]);

  const current: Outcome = pattern === "" ? { status: "empty" } : outcome;
  const done = current.status === "done" ? current : null;
  const explanation = useMemo(() => (pattern ? explain(pattern) : []), [pattern]);

  function toggleFlag(flag: Flag, on: boolean) {
    setOptions({ flags: on ? `${flags}${flag}` : flags.replace(flag, "") });
  }

  function insertSample() {
    setPattern(SAMPLE.pattern);
    setText(SAMPLE.text);
    setReplacement(SAMPLE.replacement);
  }

  const summary = done
    ? done.result.total === 0
      ? "No match"
      : `${plural(done.result.total, "match", "matches")}${flags.includes("g") ? "" : " (first only: turn on g for all)"}`
    : current.status === "invalid"
      ? "Invalid pattern"
      : current.status === "failed"
        ? "Stopped"
        : "";

  return (
    <Workbench
      toolbar={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label="Regular expression"
              error={current.status === "invalid" ? current.message : undefined}
              className="min-w-0 grow basis-72"
            >
              <div className="flex items-center gap-1 font-mono">
                <span aria-hidden className="text-fg-muted">
                  /
                </span>
                <Input
                  value={pattern}
                  onChange={(event) => setPattern(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="[a-z]+@example\.com"
                  className="min-w-0 font-mono"
                />
                <span aria-hidden className="text-fg-muted">
                  /{flags}
                </span>
              </div>
            </Field>
            <SegmentedControl
              label="Mode"
              options={MODES}
              value={options.mode}
              onValueChange={(mode) => setOptions({ mode: mode as Options["mode"] })}
            />
          </div>
          {/* Announces pattern errors as they appear (§2.4); the Field shows them. */}
          <span aria-live="assertive" className="sr-only">
            {current.status === "invalid" ? current.message : ""}
          </span>
          {replacing && (
            <Field
              label="Replacement"
              description="Use $1, $<name>, $& (whole match) or $$ (a $ sign)."
            >
              <Input
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </Field>
          )}
          <ToolbarGroup className="justify-between">
            <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <legend className="sr-only">Flags</legend>
              {FLAGS.map((flag) => (
                <Checkbox
                  key={flag}
                  label={
                    <span>
                      <span className="font-mono">{flag}</span>{" "}
                      <span className="text-fg-muted">{FLAG_NAMES[flag]}</span>
                    </span>
                  }
                  checked={flags.includes(flag)}
                  onCheckedChange={(checked) => toggleFlag(flag, checked === true)}
                />
              ))}
            </fieldset>
            <p className="inline-flex items-center gap-1.5 text-small text-fg-muted">
              <Info aria-hidden className="size-4" />
              JavaScript (ECMAScript) regex flavor
            </p>
          </ToolbarGroup>
        </div>
      }
      footer={
        <>
          {current.status === "failed" && (
            <ErrorState
              title={
                current.error.code === "E_TIMEOUT"
                  ? "The pattern was stopped"
                  : "The pattern couldn’t run"
              }
              description={current.error.message}
            />
          )}
          <Explanation items={explanation} />
        </>
      }
    >
      <WorkbenchPane
        title="Test text"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={insertSample}>
              <Sparkles aria-hidden />
              Sample
            </Button>
            <IconButton
              label="Clear test text"
              icon={<Eraser aria-hidden />}
              size="sm"
              onClick={() => setText("")}
              disabled={text === ""}
            />
          </>
        }
        status={<span className="font-mono tabular-nums">{plural(text.length, "character")}</span>}
      >
        <CodeEditor
          value={text}
          onChange={setText}
          label="Test text"
          language="text"
          wrap
          placeholder="Text to test the pattern against"
        />
      </WorkbenchPane>

      <WorkbenchPane
        title={replacing ? "Result" : "Matches"}
        actions={
          replacing &&
          done?.result.replaced != null && (
            <>
              <CopyButton value={done.result.replaced} label="Copy" variant="ghost" size="sm" />
              <IconButton
                label="Download replaced.txt"
                icon={<Download aria-hidden />}
                size="sm"
                onClick={() => downloadText(done.result.replaced ?? "", "replaced.txt")}
              />
            </>
          )
        }
        status={<span role="status">{summary}</span>}
      >
        {done && replacing && done.result.replaced !== null ? (
          <CodeEditor
            value={done.result.replaced}
            label="Replaced text"
            language="text"
            wrap
            readOnly
          />
        ) : done ? (
          <MatchView text={done.job.text} matches={done.result.matches} total={done.result.total} />
        ) : (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              title={
                current.status === "invalid"
                  ? "Fix the pattern to see matches"
                  : "Nothing to show yet"
              }
              description={
                current.status === "invalid"
                  ? "The problem is described under the pattern."
                  : "Enter a pattern and some text. Matches are highlighted here."
              }
              action={
                current.status === "empty" && (
                  <Button size="sm" onClick={insertSample}>
                    Insert sample
                  </Button>
                )
              }
            />
          </div>
        )}
      </WorkbenchPane>
    </Workbench>
  );
}

function MatchView({ text, matches, total }: { text: string; matches: Match[]; total: number }) {
  const shown = text.slice(0, HIGHLIGHT_LIMIT);
  const parts: ReactNode[] = [];
  let position = 0;
  matches.forEach((match, i) => {
    if (match.end === match.index || match.index >= shown.length) return;
    parts.push(shown.slice(position, match.index));
    parts.push(
      <mark key={i} className="rounded-sm bg-accent-soft text-fg outline outline-1 outline-accent">
        {shown.slice(match.index, match.end)}
      </mark>,
    );
    position = Math.min(match.end, shown.length);
  });
  parts.push(shown.slice(position));

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 md:p-4">
      <pre
        tabIndex={0}
        aria-label="Test text with matches highlighted"
        className="rounded-md border border-border bg-surface-2 p-3 font-mono text-code break-words whitespace-pre-wrap text-fg"
      >
        {parts}
      </pre>
      {text.length > HIGHLIGHT_LIMIT && (
        <p className="flex items-start gap-2 text-small text-fg-muted">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Only the first {plural(HIGHLIGHT_LIMIT, "character")} are highlighted; all matches are
          counted.
        </p>
      )}
      {matches.length > 0 && (
        <ol
          className="flex flex-col divide-y divide-border rounded-md border border-border"
          aria-label="Match details"
        >
          {matches.slice(0, LIST_LIMIT).map((match, i) => (
            <li key={i} className="flex flex-col gap-1 px-3 py-2">
              <p className="text-small text-fg-muted">
                Match {i + 1} · position {match.index}–{match.end}
              </p>
              <p className="font-mono text-code break-words whitespace-pre-wrap text-fg">
                {match.text === "" ? (
                  <span className="text-fg-subtle">(empty match)</span>
                ) : (
                  match.text
                )}
              </p>
              {match.groups.length > 0 && (
                <dl className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-small sm:grid-cols-2">
                  {match.groups.map((group) => (
                    <div key={group.number} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-fg-muted">
                        {group.name ? `${group.number} (${group.name})` : `Group ${group.number}`}:
                      </dt>
                      <dd className="min-w-0 font-mono break-words text-fg">
                        {group.value ?? <span className="text-fg-subtle">not matched</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ol>
      )}
      {total > LIST_LIMIT && (
        <p className="text-small text-fg-muted">
          Showing the first {LIST_LIMIT} of {plural(total, "match", "matches")}.
        </p>
      )}
    </div>
  );
}

function Explanation({ items }: { items: ReturnType<typeof explain> }) {
  if (items.length === 0) return null;
  return (
    <details className="group text-small" open>
      <summary className="cursor-pointer text-ui text-fg">Explanation</summary>
      <ol className="mt-2 flex flex-col gap-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex flex-wrap items-baseline gap-x-3"
            // Indent by nesting depth, in spacing-token steps.
            style={{ paddingInlineStart: `calc(var(--spacing) * ${item.depth * 4})` }}
          >
            <code className="rounded-sm bg-surface-2 px-1.5 font-mono text-code text-fg">
              {item.token}
            </code>
            <span className={item.known ? "text-fg" : "text-fg-muted italic"}>
              {item.description}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
