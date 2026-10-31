"use client";

import {
  CircleAlert,
  CircleCheck,
  Download,
  Eraser,
  FolderOpen,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import * as z from "zod/mini";
import { CodeEditor, type CodeEditorHandle } from "@/components/tool/CodeEditor";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { ToolbarGroup, Workbench, WorkbenchPane } from "@/components/tool/Workbench";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { notify } from "@/components/ui/Toast";
import { toToolError, type ToolError } from "@/lib/errors";
import { downloadText } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { outputFileName } from "@/lib/files/names";
import { readAsText } from "@/lib/files/read";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
import { LONG_LINE_LIMIT, SAMPLE_JSON, WORKER_THRESHOLD } from "./constants";
import { JsonTree } from "./JsonTree";
// Types only: the parser loads on the first input (architecture §8.2).
import type { JsonJob, JsonJobResult, JsonMode } from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  mode: z.enum(["format", "minify", "tree"]),
  indent: z.enum(["2", "4", "tab"]),
  sortKeys: z.boolean(),
  allowJsonc: z.boolean(),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { mode: "format", indent: "2", sortKeys: false, allowJsonc: false };

const MODES = [
  { value: "format", label: "Format" },
  { value: "minify", label: "Minify" },
  { value: "tree", label: "Tree" },
];
const INDENTS = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tab" },
];

/** Live update delay after typing (tool-specifications §2.3). */
const DEBOUNCE_MS = 150;

type Outcome =
  | { status: "empty" }
  | { status: "cancelled" }
  | { status: "done"; mode: JsonMode; result: JsonJobResult }
  | { status: "failed"; error: ToolError };

const loadLogic = () => import("./logic");

export default function JsonFormatterUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ status: "empty" });
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<ToolError | null>(null);

  const editor = useRef<CodeEditorHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const runner = useRef<WorkerRunner<JsonJob, JsonJobResult> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const errorId = useId();
  const fileInputId = useId();

  useEffect(() => () => runner.current?.dispose(), []);

  // A file chosen in the static HTML before hydration fired no React event.
  const onEarlyFile = useEffectEvent((file: File) => void openFile(file));
  useEffect(() => {
    const element = fileInput.current;
    const file = element?.files?.[0];
    if (file && element) {
      onEarlyFile(file);
      element.value = "";
    }
  }, []);

  // Live processing, debounced. Large inputs go to the worker; a newer input
  // cancels the job in flight.
  useEffect(() => {
    const id = ++sequence.current;
    controller.current?.abort();
    // Empty input renders as empty without a job (see `current` below).
    if (input.trim() === "") return;
    const job: JsonJob = {
      op: options.mode,
      text: input,
      options: {
        indent: options.indent,
        sortKeys: options.sortKeys,
        allowJsonc: options.allowJsonc,
      },
    };
    const timer = setTimeout(async () => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        let result: JsonJobResult;
        if (input.length > WORKER_THRESHOLD) {
          setBusy(true);
          runner.current ??= createWorkerRunner<JsonJob, JsonJobResult>(
            () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
          );
          result = await runner.current.run(job, { signal: abort.signal });
        } else {
          result = (await loadLogic()).runJob(job);
        }
        if (id !== sequence.current) return;
        setOutcome({ status: "done", mode: options.mode, result });
      } catch (error) {
        if (id !== sequence.current) return;
        const toolError = toToolError(error, "formatting the JSON");
        if (toolError.code === "E_CANCELLED") setOutcome({ status: "cancelled" });
        else setOutcome({ status: "failed", error: toolError });
      } finally {
        if (id === sequence.current) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, options.mode, options.indent, options.sortKeys, options.allowJsonc]);

  async function openFile(file: File) {
    setFileError(null);
    const [check] = checkLimits([file], meta.limits, getDeviceClass());
    if (check?.status === "reject") {
      setFileError(check.error);
      return;
    }
    if (check?.status === "warn") notify.warning(check.message);
    try {
      const text = await readAsText(file);
      setFileName(file.name);
      setInput(text);
    } catch (error) {
      setFileError(toToolError(error, "opening the file"));
    }
  }

  function clear() {
    setInput("");
    setFileName(null);
    setFileError(null);
    editor.current?.focus();
  }

  const empty = input.trim() === "";
  // Empty input never runs a job, so it is derived here rather than stored.
  const current: Outcome = empty ? { status: "empty" } : outcome;
  const working = busy && !empty;
  const result = current.status === "done" ? current.result : null;
  const parseError = result && !result.ok ? result.error : null;
  const formatted = result?.ok && "output" in result ? result : null;
  const tree = result?.ok && "root" in result ? result : null;
  const bigNumbers = result?.ok ? result.bigNumbers : null;
  const output = formatted?.output ?? "";
  const tooLongToShow =
    current.status === "done" && current.mode === "minify" && output.length > LONG_LINE_LIMIT;
  const action = options.mode === "minify" ? "minified" : "formatted";
  const downloadName = fileName ? outputFileName(fileName, action, "json") : `${action}.json`;
  const large = input.length > meta.limits.desktop.softBytes;

  const inputStatus = (() => {
    if (empty) return <span>Paste JSON or open a .json file.</span>;
    if (current.status === "cancelled") return <span>Cancelled. Edit the input to try again.</span>;
    if (working || current.status === "empty") return <span>Checking…</span>;
    if (parseError) {
      return (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <CircleAlert aria-hidden className="size-4" />
          Invalid JSON: line {parseError.line}, column {parseError.column}
        </span>
      );
    }
    if (result?.ok) {
      return (
        <span className="inline-flex items-center gap-1.5 text-success">
          <CircleCheck aria-hidden className="size-4" />
          Valid JSON
          {large && <span className="text-fg-muted">· Large input, may be slow</span>}
        </span>
      );
    }
    return null;
  })();

  return (
    <Workbench
      toolbar={
        <>
          <SegmentedControl
            label="Mode"
            options={MODES}
            value={options.mode}
            onValueChange={(mode) => setOptions({ mode: mode as Options["mode"] })}
          />
          <ToolbarGroup>
            {options.mode === "format" && (
              <div className="w-36">
                <Select
                  aria-label="Indentation"
                  options={INDENTS}
                  value={options.indent}
                  onValueChange={(indent) => setOptions({ indent: indent as Options["indent"] })}
                />
              </div>
            )}
            <Switch
              label="Sort keys"
              checked={options.sortKeys}
              onCheckedChange={(sortKeys) => setOptions({ sortKeys })}
            />
            <Switch
              label="Allow comments"
              checked={options.allowJsonc}
              onCheckedChange={(allowJsonc) => setOptions({ allowJsonc })}
            />
          </ToolbarGroup>
        </>
      }
      footer={
        (parseError || fileError || current.status === "failed" || bigNumbers || working) && (
          <>
            {working && (
              <ProcessingState
                label="Processing large JSON"
                detail={`Processing ${formatBytes(input.length)} in the background…`}
                onCancel={() => controller.current?.abort()}
                delayMs={300}
              />
            )}
            {fileError && (
              <ErrorState title="The file couldn’t be opened" description={fileError.message} />
            )}
            {current.status === "failed" && (
              <ErrorState
                title="The JSON couldn’t be processed"
                description={current.error.message}
                action={
                  current.error.details ? (
                    <details className="text-small text-fg-muted">
                      <summary className="cursor-pointer">Details</summary>
                      <p className="mt-1 font-mono break-all">{current.error.details}</p>
                    </details>
                  ) : undefined
                }
              />
            )}
            {parseError && (
              <div id={errorId}>
                <ErrorState
                  title="Invalid JSON"
                  description={`Line ${parseError.line}, column ${parseError.column}: ${parseError.message}`}
                  action={
                    <Button size="sm" onClick={() => editor.current?.focusAt(parseError.offset)}>
                      Go to error
                    </Button>
                  }
                />
              </div>
            )}
            {bigNumbers && (
              <p className="flex items-start gap-2 rounded-md border border-warning bg-warning-soft p-3 text-small text-fg">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                <span>
                  {plural(bigNumbers.count, "number")} {bigNumbers.count === 1 ? "is" : "are"}{" "}
                  larger than 9,007,199,254,740,991, so JavaScript would round{" "}
                  {bigNumbers.count === 1 ? "it" : "them"} (for example{" "}
                  <code className="font-mono">{bigNumbers.examples[0]?.path}</code>). The output
                  keeps every digit.
                </span>
              </p>
            )}
          </>
        )
      }
    >
      <WorkbenchPane
        title="Input"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_JSON)}>
              <Sparkles aria-hidden />
              Sample
            </Button>
            {/* A label for the real input opens the picker natively, also before
                hydration and in in-app browsers (see DropZone). */}
            <span className="inline-flex">
              <input
                ref={fileInput}
                id={fileInputId}
                type="file"
                accept=".json,application/json,text/plain"
                className="peer sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void openFile(file);
                  event.target.value = "";
                }}
              />
              <label
                htmlFor={fileInputId}
                className={buttonClasses({
                  variant: "ghost",
                  size: "sm",
                  className: "peer-focus-visible:focus-ring",
                })}
              >
                <FolderOpen aria-hidden />
                Open file
              </label>
            </span>
            <IconButton
              label="Clear input"
              icon={<Eraser aria-hidden />}
              size="sm"
              onClick={clear}
              disabled={input === ""}
            />
          </>
        }
        status={<span role="status">{inputStatus}</span>}
      >
        <CodeEditor
          ref={editor}
          value={input}
          onChange={setInput}
          label="JSON input"
          placeholder={'{ "paste": "JSON here" }'}
          errorOffset={parseError?.offset ?? null}
          describedBy={parseError ? errorId : undefined}
          invalid={Boolean(parseError)}
        />
      </WorkbenchPane>

      <WorkbenchPane
        title={options.mode === "tree" ? "Tree" : "Output"}
        actions={
          options.mode !== "tree" && (
            <>
              <CopyButton
                value={() => output}
                label="Copy"
                variant="ghost"
                size="sm"
                disabled={!formatted}
              />
              <IconButton
                label={`Download ${downloadName}`}
                icon={<Download aria-hidden />}
                size="sm"
                disabled={!formatted}
                onClick={() => downloadText(output, downloadName, "application/json")}
              />
            </>
          )
        }
        status={
          formatted ? (
            <span className="font-mono tabular-nums">
              {plural(formatted.stats.lines, "line")} · {formatBytes(formatted.stats.bytes)}
            </span>
          ) : tree ? (
            <span className="font-mono tabular-nums">{plural(tree.nodes, "value")}</span>
          ) : null
        }
      >
        {tree ? (
          <JsonTree root={tree.root} />
        ) : tooLongToShow ? (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              title={`The minified JSON is ${formatBytes(formatted?.stats.bytes ?? 0)} on one line`}
              description="That is too long to show here. Copy or download it with the buttons above."
            />
          </div>
        ) : formatted ? (
          <CodeEditor value={output} label="Formatted JSON output" readOnly />
        ) : (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              title={parseError ? "Fix the error to see the output" : "Nothing to show yet"}
              description={
                parseError
                  ? "The first problem is highlighted in the input."
                  : "Paste JSON or open a file. Formatted output appears here."
              }
              action={
                !parseError &&
                input.trim() === "" && (
                  <Button size="sm" onClick={() => setInput(SAMPLE_JSON)}>
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
