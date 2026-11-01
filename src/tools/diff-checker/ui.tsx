"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Download,
  Eraser,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as z from "zod/mini";
import { CodeEditor } from "@/components/tool/CodeEditor";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { useHandoff } from "@/components/tool/useHandoff";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { ToolbarGroup, Workbench, WorkbenchPane } from "@/components/tool/Workbench";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { notify } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { downloadText } from "@/lib/files/download";
import { plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { readAsText } from "@/lib/files/read";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
// Types only: the diff library loads in the worker on the first comparison.
import type { DiffJob, DiffJobResult, DiffResult, Row, Segment } from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  view: z.enum(["split", "inline"]),
  granularity: z.enum(["line", "word", "char"]),
  ignoreWhitespace: z.boolean(),
  ignoreCase: z.boolean(),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = {
  view: "split",
  granularity: "word",
  ignoreWhitespace: false,
  ignoreCase: false,
};

const VIEWS = [
  { value: "split", label: "Side by side" },
  { value: "inline", label: "Inline" },
];
const GRANULARITIES = [
  { value: "line", label: "Line" },
  { value: "word", label: "Word" },
  { value: "char", label: "Character" },
];

const SAMPLE_ORIGINAL = `Dear team,

The meeting is on Tuesday at 10:00 in room 4.
Please bring the quarterly report.
Lunch will be provided.

Thanks,
Ada
`;
const SAMPLE_CHANGED = `Dear team,

The meeting is on Thursday at 14:00 in room 4.
Please bring the quarterly report and your laptop.

Thanks,
Ada Lovelace
`;

/** Wait after typing before comparing (larger than §2.3's 150 ms: diffs cost more). */
const DEBOUNCE_MS = 300;
/** Estimated row height before measuring (one line of code text plus padding). */
const ROW_ESTIMATE = 28;

type Outcome =
  | { status: "empty" }
  | { status: "cancelled" }
  | { status: "done"; result: DiffResult }
  | { status: "failed"; error: ToolError };

export default function DiffCheckerUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  // A text file dropped on the homepage becomes the original.
  useHandoff(({ files }) => {
    if (files?.[0]) void openFile(files[0], setOriginal);
  });
  const [outcome, setOutcome] = useState<Outcome>({ status: "empty" });
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<ToolError | null>(null);

  const runner = useRef<WorkerRunner<DiffJob, DiffJobResult> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  useEffect(() => () => runner.current?.dispose(), []);

  // Compare in the worker after typing stops; a newer input cancels the job.
  useEffect(() => {
    const id = ++sequence.current;
    controller.current?.abort();
    if (original === "" && changed === "") return;
    const job: DiffJob = {
      original,
      changed,
      options: {
        granularity: options.granularity,
        ignoreWhitespace: options.ignoreWhitespace,
        ignoreCase: options.ignoreCase,
      },
    };
    const timer = setTimeout(async () => {
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      try {
        runner.current ??= createWorkerRunner<DiffJob, DiffJobResult>(
          () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
        );
        const result = await runner.current.run(job, { signal: abort.signal });
        if (id !== sequence.current) return;
        setOutcome(
          result.ok
            ? { status: "done", result: result.result }
            : { status: "failed", error: toolErrors.timeout(result.message) },
        );
      } catch (error) {
        if (id !== sequence.current) return;
        const toolError = toToolError(error, "comparing the texts");
        if (toolError.code === "E_CANCELLED") setOutcome({ status: "cancelled" });
        else setOutcome({ status: "failed", error: toolError });
      } finally {
        if (id === sequence.current) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [original, changed, options.granularity, options.ignoreWhitespace, options.ignoreCase]);

  async function openFile(file: File, set: (text: string) => void) {
    setFileError(null);
    const [check] = checkLimits([file], meta.limits, getDeviceClass());
    if (check?.status === "reject") {
      setFileError(check.error);
      return;
    }
    if (check?.status === "warn") notify.warning(check.message);
    try {
      set(await readAsText(file));
    } catch (error) {
      setFileError(toToolError(error, "opening the file"));
    }
  }

  const empty = original === "" && changed === "";
  const current: Outcome = empty ? { status: "empty" } : outcome;
  const result = current.status === "done" ? current.result : null;
  const working = busy && !empty;

  return (
    <Workbench
      toolbar={
        <>
          {/* Side by side needs the width: narrow screens always show the inline view. */}
          <div className="hidden lg:block">
            <SegmentedControl
              label="View"
              options={VIEWS}
              value={options.view}
              onValueChange={(view) => setOptions({ view: view as Options["view"] })}
            />
          </div>
          <SegmentedControl
            label="Highlight changes by"
            options={GRANULARITIES}
            value={options.granularity}
            onValueChange={(granularity) =>
              setOptions({ granularity: granularity as Options["granularity"] })
            }
          />
          <ToolbarGroup>
            <Switch
              label="Ignore whitespace"
              checked={options.ignoreWhitespace}
              onCheckedChange={(ignoreWhitespace) => setOptions({ ignoreWhitespace })}
            />
            <Switch
              label="Ignore case"
              checked={options.ignoreCase}
              onCheckedChange={(ignoreCase) => setOptions({ ignoreCase })}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={empty}
              onClick={() => {
                setOriginal(changed);
                setChanged(original);
              }}
            >
              <ArrowLeftRight aria-hidden />
              Swap
            </Button>
          </ToolbarGroup>
        </>
      }
      footer={
        <>
          {working && (
            <ProcessingState
              label="Comparing"
              detail="Comparing in the background…"
              onCancel={() => controller.current?.abort()}
              delayMs={300}
            />
          )}
          {fileError && (
            <ErrorState title="The file couldn’t be opened" description={fileError.message} />
          )}
          {current.status === "failed" && (
            <ErrorState
              title="The texts couldn’t be compared"
              description={current.error.message}
            />
          )}
          {result ? (
            <DiffView
              result={result}
              view={options.view}
              ignoring={[
                options.ignoreWhitespace && "whitespace",
                options.ignoreCase && "case",
              ].filter((value): value is string => Boolean(value))}
            />
          ) : (
            !working && (
              <p className="text-small text-fg-muted">
                {empty
                  ? "Paste or open the original and the changed text. Differences appear here."
                  : current.status === "cancelled"
                    ? "Cancelled. Edit either text to compare again."
                    : ""}
              </p>
            )
          )}
        </>
      }
    >
      <TextPane
        title="Original"
        value={original}
        onChange={setOriginal}
        onFile={(file) => openFile(file, setOriginal)}
        onSample={() => {
          setOriginal(SAMPLE_ORIGINAL);
          setChanged(SAMPLE_CHANGED);
        }}
      />
      <TextPane
        title="Changed"
        value={changed}
        onChange={setChanged}
        onFile={(file) => openFile(file, setChanged)}
      />
    </Workbench>
  );
}

function TextPane({
  title,
  value,
  onChange,
  onFile,
  onSample,
}: {
  title: "Original" | "Changed";
  value: string;
  onChange: (value: string) => void;
  onFile: (file: File) => void;
  onSample?: () => void;
}) {
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const lines = value === "" ? 0 : value.split("\n").length - (value.endsWith("\n") ? 1 : 0);

  // A file chosen in the static HTML before hydration fired no React event.
  const onEarlyFile = useEffectEvent(onFile);
  useEffect(() => {
    const element = fileInput.current;
    const chosen = element?.files?.[0];
    if (chosen && element) {
      onEarlyFile(chosen);
      element.value = "";
    }
  }, []);

  return (
    <WorkbenchPane
      title={title}
      actions={
        <>
          {onSample && (
            <Button variant="ghost" size="sm" onClick={onSample}>
              <Sparkles aria-hidden />
              Sample
            </Button>
          )}
          <span className="inline-flex">
            <input
              ref={fileInput}
              id={inputId}
              type="file"
              accept="text/*,.txt,.md,.json,.csv,.xml,.yml,.yaml,.js,.ts,.css,.html,.log"
              className="peer sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.target.value = "";
              }}
            />
            <label
              htmlFor={inputId}
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className: "peer-focus-visible:focus-ring",
              })}
            >
              <FolderOpen aria-hidden />
              <span>
                Open file<span className="sr-only"> ({title.toLowerCase()})</span>
              </span>
            </label>
          </span>
          <IconButton
            label={`Clear ${title.toLowerCase()} text`}
            icon={<Eraser aria-hidden />}
            size="sm"
            onClick={() => onChange("")}
            disabled={value === ""}
          />
        </>
      }
      status={<span className="font-mono tabular-nums">{plural(lines, "line")}</span>}
    >
      <CodeEditor
        value={value}
        onChange={onChange}
        label={`${title} text`}
        language="text"
        placeholder={title === "Original" ? "Paste the original text" : "Paste the changed text"}
      />
    </WorkbenchPane>
  );
}

type InlineRow = {
  kind: "equal" | "removed" | "added";
  leftNo: number | null;
  rightNo: number | null;
  segments: Segment[];
  change: number | null;
};

/** One line per row; within a change, all removals come before the additions (as in a unified diff). */
function toInline(rows: Row[]): InlineRow[] {
  const out: InlineRow[] = [];
  let additions: InlineRow[] = [];
  for (const row of rows) {
    if (row.kind === "equal") {
      out.push(...additions);
      additions = [];
      out.push({
        kind: "equal",
        leftNo: row.leftNo,
        rightNo: row.rightNo,
        segments: row.right ?? [],
        change: null,
      });
      continue;
    }
    if (additions.length > 0 && additions[0]!.change !== row.change) {
      out.push(...additions);
      additions = [];
    }
    if (row.left)
      out.push({
        kind: "removed",
        leftNo: row.leftNo,
        rightNo: null,
        segments: row.left,
        change: row.change,
      });
    if (row.right)
      additions.push({
        kind: "added",
        leftNo: null,
        rightNo: row.rightNo,
        segments: row.right,
        change: row.change,
      });
  }
  return [...out, ...additions];
}

// Side by side needs the width (Tailwind lg); narrow screens get the inline view.
const WIDE = "(min-width: 64rem)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isWide = () => window.matchMedia(WIDE).matches;
const notWide = () => false;

function DiffView({
  result,
  view,
  ignoring,
}: {
  result: DiffResult;
  view: Options["view"];
  /** Ignore options in effect, e.g. ["whitespace"]. */
  ignoring: string[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const regionId = useId();
  const inline = useMemo(() => toInline(result.rows), [result.rows]);
  const wide = useSyncExternalStore(subscribeWide, isWide, notWide);
  const split = view === "split" && wide;
  const count = split ? result.rows.length : inline.length;

  // TanStack Virtual re-renders on scroll by design; the React Compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library -- see above
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 20,
  });

  const changes = result.changeStarts.length;
  const startIndex = (change: number) =>
    split ? result.changeStarts[change]! : inline.findIndex((row) => row.change === change);

  function go(step: 1 | -1) {
    if (changes === 0) return;
    const next =
      current === null ? (step === 1 ? 0 : changes - 1) : (current + step + changes) % changes;
    setCurrent(next);
    virtualizer.scrollToIndex(startIndex(next), { align: "center" });
  }

  if (result.identical) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-success bg-success-soft p-3 text-small text-fg">
        <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
        <span role="status">
          The texts are identical
          {ignoring.length > 0 && ` when ignoring differences in ${ignoring.join(" and ")}`}.
        </span>
      </p>
    );
  }

  return (
    <section aria-labelledby={regionId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={regionId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui text-fg">
          Differences
          <span className="text-small text-fg-muted">
            <span className="text-success">+{result.added.toLocaleString("en-US")}</span>{" "}
            <span className="text-danger">−{result.removed.toLocaleString("en-US")}</span> lines ·{" "}
            {plural(changes, "change")}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-1">
          <span role="status" className="px-2 text-small text-fg-muted tabular-nums">
            {current === null ? "" : `Change ${current + 1} of ${changes}`}
          </span>
          <IconButton
            label="Previous change (P)"
            icon={<ChevronUp aria-hidden />}
            size="sm"
            onClick={() => go(-1)}
          />
          <IconButton
            label="Next change (N)"
            icon={<ChevronDown aria-hidden />}
            size="sm"
            onClick={() => go(1)}
          />
          <CopyButton value={result.unified} label="Copy unified diff" variant="ghost" size="sm" />
          <IconButton
            label="Download changes.diff"
            icon={<Download aria-hidden />}
            size="sm"
            onClick={() => downloadText(result.unified, "changes.diff", "text/x-diff")}
          />
        </div>
      </div>
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Differences, line by line. Press N and P to move between changes."
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          if (event.key === "n") go(1);
          else if (event.key === "p") go(-1);
        }}
        className="h-120 overflow-auto rounded-md border border-border bg-surface font-mono text-code"
      >
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              {split ? (
                <SplitRow row={result.rows[item.index]!} current={current} />
              ) : (
                <InlineLine row={inline[item.index]!} current={current} />
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-small text-fg-muted">
        Press <Kbd>N</Kbd> and <Kbd>P</Kbd> in the differences to jump between changes.
      </p>
    </section>
  );
}

const SIDE = {
  removed: { line: "bg-danger-soft", mark: "−", strong: "bg-danger/25", label: "Removed: " },
  added: { line: "bg-success-soft", mark: "+", strong: "bg-success/25", label: "Added: " },
  equal: { line: "", mark: " ", strong: "", label: "" },
} as const;

/** Line number, +/− marker and text of one side of a row (flex, token widths). */
function Cell({
  no,
  segments,
  side,
  numberWidth = "w-14",
}: {
  no: number | null;
  segments: Segment[] | null;
  side: keyof typeof SIDE;
  numberWidth?: "w-12" | "w-14";
}) {
  const style = SIDE[side];
  if (!segments) return <div aria-hidden className="min-w-0 flex-1 bg-surface-2" />;
  return (
    <div className={cn("flex min-w-0 flex-1", style.line)}>
      <span
        className={cn(
          "shrink-0 px-2 py-0.5 text-right text-fg-subtle tabular-nums select-none",
          numberWidth,
        )}
      >
        {no}
      </span>
      <span aria-hidden className="w-5 shrink-0 py-0.5 text-center select-none">
        {style.mark}
      </span>
      <span className="min-w-0 flex-1 py-0.5 pr-3 break-words whitespace-pre-wrap text-fg">
        <span className="sr-only">{style.label}</span>
        {segments.map((segment, i) =>
          segment.changed && side !== "equal" ? (
            side === "removed" ? (
              <del key={i} className={cn("rounded-sm no-underline", style.strong)}>
                {segment.text}
              </del>
            ) : (
              <ins key={i} className={cn("rounded-sm no-underline", style.strong)}>
                {segment.text}
              </ins>
            )
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}
        {segments.length === 0 && " "}
      </span>
    </div>
  );
}

function SplitRow({ row, current }: { row: Row; current: number | null }) {
  return (
    <div
      className={cn(
        "flex border-l-2",
        row.change !== null && row.change === current ? "border-accent" : "border-transparent",
      )}
    >
      <Cell no={row.leftNo} segments={row.left} side={row.kind === "equal" ? "equal" : "removed"} />
      <Cell no={row.rightNo} segments={row.right} side={row.kind === "equal" ? "equal" : "added"} />
    </div>
  );
}

function InlineLine({ row, current }: { row: InlineRow; current: number | null }) {
  return (
    <div
      className={cn(
        "flex border-l-2",
        row.change !== null && row.change === current ? "border-accent" : "border-transparent",
      )}
    >
      <span className="w-12 shrink-0 px-2 py-0.5 text-right text-fg-subtle tabular-nums select-none">
        {row.leftNo}
      </span>
      <Cell no={row.rightNo} segments={row.segments} side={row.kind} numberWidth="w-12" />
    </div>
  );
}
