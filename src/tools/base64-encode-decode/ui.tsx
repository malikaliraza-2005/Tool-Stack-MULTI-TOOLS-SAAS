"use client";

import {
  ArrowLeftRight,
  CircleAlert,
  CircleCheck,
  Download,
  Eraser,
  FileIcon,
  FolderOpen,
  Sparkles,
  X,
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
import { Switch } from "@/components/ui/Switch";
import { notify } from "@/components/ui/Toast";
import { toToolError, type ToolError } from "@/lib/errors";
import { downloadBlob, downloadText } from "@/lib/files/download";
import { formatBytes } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { outputFileName } from "@/lib/files/names";
import { readAsArrayBuffer, readAsText } from "@/lib/files/read";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
import { LONG_LINE_LIMIT, SAMPLE_BASE64, SAMPLE_TEXT, WORKER_THRESHOLD } from "./constants";
// Types only: the codec loads on the first input (architecture §8.2).
import type { Base64Job, Base64JobResult } from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  mode: z.enum(["encode", "decode"]),
  urlSafe: z.boolean(),
  wrap: z.boolean(),
  dataUrl: z.boolean(),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { mode: "encode", urlSafe: false, wrap: false, dataUrl: false };

const MODES = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
];

/** Live update delay after typing (tool-specifications §2.3). */
const DEBOUNCE_MS = 150;

/** A file being encoded. Its bytes stay in memory only while it's open. */
type SourceFile = { name: string; size: number; type: string; bytes: ArrayBuffer };

type Outcome =
  | { status: "empty" }
  | { status: "cancelled" }
  | { status: "done"; result: Base64JobResult }
  | { status: "failed"; error: ToolError };

const loadLogic = () => import("./logic");

export default function Base64UI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<SourceFile | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ status: "empty" });
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<ToolError | null>(null);

  const editor = useRef<CodeEditorHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const runner = useRef<WorkerRunner<Base64Job, Base64JobResult> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const errorId = useId();
  const fileInputId = useId();

  const encoding = options.mode === "encode";
  // A file is the source only when encoding; Decode reads Base64 text.
  const source = encoding ? file : null;

  useEffect(() => () => runner.current?.dispose(), []);

  // A file chosen in the static HTML before hydration fired no React event.
  const onEarlyFile = useEffectEvent((chosen: File) => void openFile(chosen));
  useEffect(() => {
    const element = fileInput.current;
    const chosen = element?.files?.[0];
    if (chosen && element) {
      onEarlyFile(chosen);
      element.value = "";
    }
  }, []);

  // Live processing, debounced. Files and large text go to the worker; a
  // newer input cancels the job in flight.
  useEffect(() => {
    const id = ++sequence.current;
    controller.current?.abort();
    if (!source && input.trim() === "") return;
    const job: Base64Job = source
      ? {
          op: "encode-file",
          bytes: source.bytes,
          browserType: source.type,
          options: { urlSafe: options.urlSafe, wrap: options.wrap, dataUrl: options.dataUrl },
        }
      : encoding
        ? {
            op: "encode-text",
            text: input,
            options: { urlSafe: options.urlSafe, wrap: options.wrap },
          }
        : { op: "decode", text: input };
    const timer = setTimeout(async () => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        let result: Base64JobResult;
        if (source || input.length > WORKER_THRESHOLD) {
          setBusy(true);
          runner.current ??= createWorkerRunner<Base64Job, Base64JobResult>(
            () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
          );
          // The file's bytes are copied, not transferred: they're needed again when options change.
          result = await runner.current.run(job, { signal: abort.signal });
        } else {
          result = (await loadLogic()).runJob(job);
        }
        if (id !== sequence.current) return;
        setOutcome({ status: "done", result });
      } catch (error) {
        if (id !== sequence.current) return;
        const toolError = toToolError(error, "converting Base64");
        if (toolError.code === "E_CANCELLED") setOutcome({ status: "cancelled" });
        else setOutcome({ status: "failed", error: toolError });
      } finally {
        if (id === sequence.current) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, source, encoding, options.urlSafe, options.wrap, options.dataUrl]);

  async function openFile(chosen: File) {
    setFileError(null);
    const [check] = checkLimits([chosen], meta.limits, getDeviceClass());
    if (check?.status === "reject") {
      setFileError(check.error);
      return;
    }
    if (check?.status === "warn") notify.warning(check.message);
    try {
      if (encoding) {
        const bytes = await readAsArrayBuffer(chosen);
        setFile({ name: chosen.name, size: chosen.size, type: chosen.type, bytes });
      } else {
        const text = await readAsText(chosen);
        setFileName(chosen.name);
        setInput(text);
      }
    } catch (error) {
      setFileError(toToolError(error, "opening the file"));
    }
  }

  function clear() {
    setInput("");
    setFile(null);
    setFileName(null);
    setFileError(null);
    editor.current?.focus();
  }

  function setMode(mode: Options["mode"]) {
    // Leaving Encode releases the file (§2.2: reset releases memory).
    if (mode === "decode") setFile(null);
    setFileError(null);
    setOptions({ mode });
  }

  const empty = !source && input.trim() === "";
  // Empty input never runs a job, so it is derived here rather than stored.
  const current: Outcome = empty ? { status: "empty" } : outcome;
  const working = busy && !empty;
  const result = current.status === "done" ? current.result : null;
  // A result from the other mode (before the new job finishes) isn't shown.
  const encoded = encoding && result?.op === "encode" ? result : null;
  const decoded = !encoding && result?.op === "decode" ? result : null;
  const decodeError = decoded && !decoded.ok ? decoded.error : null;
  const decodedOk = decoded?.ok ? decoded : null;

  /** Text shown in the output pane, when the output is text. */
  const outputText = encoded?.output ?? decodedOk?.text ?? null;
  const tooLongToShow =
    outputText !== null && outputText.length > LONG_LINE_LIMIT && !outputText.includes("\n");
  const baseName = source?.name ?? fileName;

  const downloadName = (() => {
    if (encoded) return baseName ? outputFileName(baseName, "base64", "txt") : "encoded.txt";
    if (!decodedOk) return null;
    // Text of unknown type downloads as .txt rather than .bin.
    const ext =
      decodedOk.text !== null && decodedOk.type.ext === "bin" ? "txt" : decodedOk.type.ext;
    return baseName ? outputFileName(baseName, "decoded", ext) : `decoded.${ext}`;
  })();

  function downloadOutput() {
    if (!downloadName) return;
    if (encoded) downloadText(encoded.output, downloadName);
    else if (decodedOk) {
      downloadBlob(new Blob([decodedOk.bytes], { type: decodedOk.type.mime }), downloadName);
    }
  }

  function swap() {
    if (outputText === null) return;
    setFile(null);
    setFileName(null);
    setInput(outputText);
    setOptions({ mode: encoding ? "decode" : "encode" });
  }

  const inputStatus = (() => {
    if (source) return <span>{formatBytes(source.size)} file</span>;
    if (empty) {
      return (
        <span>
          {encoding ? "Type or paste text, or open a file." : "Paste Base64 or a data URL."}
        </span>
      );
    }
    if (current.status === "cancelled") return <span>Cancelled. Edit the input to try again.</span>;
    if (working || current.status === "empty") return <span>Checking…</span>;
    if (decodeError) {
      return (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <CircleAlert aria-hidden className="size-4" />
          Invalid Base64: line {decodeError.line}, column {decodeError.column}
        </span>
      );
    }
    if (decodedOk) {
      return (
        <span className="inline-flex items-center gap-1.5 text-success">
          <CircleCheck aria-hidden className="size-4" />
          Valid Base64
        </span>
      );
    }
    return (
      <span className="font-mono tabular-nums">
        {input.length.toLocaleString("en-US")} characters
      </span>
    );
  })();

  const outputStatus = encoded ? (
    <span className="font-mono tabular-nums">
      {encoded.output.length.toLocaleString("en-US")} characters
    </span>
  ) : decodedOk ? (
    <span className="font-mono tabular-nums">
      {formatBytes(decodedOk.size)}
      {decodedOk.text === null ? ` · ${decodedOk.type.label ?? "binary data"}` : " · UTF-8 text"}
    </span>
  ) : null;

  return (
    <Workbench
      toolbar={
        <>
          <SegmentedControl
            label="Mode"
            options={MODES}
            value={options.mode}
            onValueChange={(mode) => setMode(mode as Options["mode"])}
          />
          <ToolbarGroup>
            {encoding && (
              <>
                <Switch
                  label="URL-safe"
                  checked={options.urlSafe}
                  disabled={Boolean(source) && options.dataUrl}
                  onCheckedChange={(urlSafe) => setOptions({ urlSafe })}
                />
                <Switch
                  label="Wrap at 76"
                  checked={options.wrap}
                  disabled={Boolean(source) && options.dataUrl}
                  onCheckedChange={(wrap) => setOptions({ wrap })}
                />
                {source && (
                  <Switch
                    label="Data URL"
                    checked={options.dataUrl}
                    onCheckedChange={(dataUrl) => setOptions({ dataUrl })}
                  />
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={swap}
              disabled={outputText === null || tooLongToShow}
            >
              <ArrowLeftRight aria-hidden />
              Swap
            </Button>
          </ToolbarGroup>
        </>
      }
      footer={
        (decodeError || fileError || current.status === "failed" || working) && (
          <>
            {working && (
              <ProcessingState
                label="Converting"
                detail={`Processing ${formatBytes(source?.size ?? input.length)} in the background…`}
                onCancel={() => controller.current?.abort()}
                delayMs={300}
              />
            )}
            {fileError && (
              <ErrorState title="The file couldn’t be opened" description={fileError.message} />
            )}
            {current.status === "failed" && (
              <ErrorState
                title="The conversion failed"
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
            {decodeError && (
              <div id={errorId}>
                <ErrorState
                  title="Invalid Base64"
                  description={`Line ${decodeError.line}, column ${decodeError.column}: ${decodeError.message}`}
                  action={
                    <Button size="sm" onClick={() => editor.current?.focusAt(decodeError.offset)}>
                      Go to error
                    </Button>
                  }
                />
              </div>
            )}
          </>
        )
      }
    >
      <WorkbenchPane
        title="Input"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setFileName(null);
                setInput(encoding ? SAMPLE_TEXT : SAMPLE_BASE64);
              }}
            >
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
                accept={encoding ? undefined : ".txt,text/plain"}
                className="peer sr-only"
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  if (chosen) void openFile(chosen);
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
              disabled={input === "" && !source}
            />
          </>
        }
        status={<span role="status">{inputStatus}</span>}
      >
        {source ? (
          <div className="flex h-full items-center p-4">
            <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 p-4">
              <FileIcon aria-hidden className="size-6 shrink-0 text-fg-muted" />
              <div className="flex min-w-0 grow flex-col">
                <p className="truncate text-ui text-fg">{source.name}</p>
                <p className="text-small text-fg-muted">
                  {formatBytes(source.size)}
                  {source.type ? ` · ${source.type}` : ""}
                </p>
              </div>
              <IconButton
                label={`Remove ${source.name}`}
                icon={<X aria-hidden />}
                size="sm"
                onClick={clear}
              />
            </div>
          </div>
        ) : (
          <CodeEditor
            // The label and placeholder differ by mode; CodeMirror sets them once.
            key={options.mode}
            ref={editor}
            value={input}
            onChange={(next) => {
              setInput(next);
              if (next === "") setFileName(null);
            }}
            label={encoding ? "Text to encode" : "Base64 to decode"}
            language="text"
            wrap
            placeholder={encoding ? "Text to encode" : "SGVsbG8sIHdvcmxkIQ== or data:…;base64,…"}
            errorOffset={decodeError?.offset ?? null}
            describedBy={decodeError ? errorId : undefined}
            invalid={Boolean(decodeError)}
          />
        )}
      </WorkbenchPane>

      <WorkbenchPane
        title="Output"
        actions={
          <>
            <CopyButton
              value={() => outputText ?? ""}
              label="Copy"
              variant="ghost"
              size="sm"
              disabled={outputText === null}
            />
            <IconButton
              label={downloadName ? `Download ${downloadName}` : "Download"}
              icon={<Download aria-hidden />}
              size="sm"
              disabled={!downloadName}
              onClick={downloadOutput}
            />
          </>
        }
        status={outputStatus}
      >
        {decodedOk && decodedOk.text === null ? (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              icon={<FileIcon aria-hidden />}
              title={`This is ${decodedOk.type.label ?? "binary data"}, ${formatBytes(decodedOk.size)}`}
              description="It isn’t text, so it isn’t shown here. Download it as a file."
              action={
                <Button size="sm" onClick={downloadOutput}>
                  <Download aria-hidden />
                  Download {downloadName}
                </Button>
              }
            />
          </div>
        ) : tooLongToShow ? (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              title={`The output is ${(outputText?.length ?? 0).toLocaleString("en-US")} characters on one line`}
              description="That is too long to show here. Copy or download it with the buttons above."
            />
          </div>
        ) : outputText !== null ? (
          <CodeEditor
            key={options.mode}
            value={outputText}
            label={encoding ? "Base64 output" : "Decoded text"}
            language="text"
            wrap
            readOnly
          />
        ) : (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              title={decodeError ? "Fix the error to see the output" : "Nothing to show yet"}
              description={
                decodeError
                  ? "The first problem is highlighted in the input."
                  : encoding
                    ? "Type text or open a file. Its Base64 appears here."
                    : "Paste Base64. The decoded text or file appears here."
              }
              action={
                !decodeError &&
                empty && (
                  <Button
                    size="sm"
                    onClick={() => setInput(encoding ? SAMPLE_TEXT : SAMPLE_BASE64)}
                  >
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
