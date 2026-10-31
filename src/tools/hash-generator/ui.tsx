"use client";

import { CircleCheck, CircleX, Eraser, FileIcon, FolderOpen, Sparkles, X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import * as z from "zod/mini";
import { CodeEditor, type CodeEditorHandle } from "@/components/tool/CodeEditor";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultList } from "@/components/tool/ResultList";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { ToolbarGroup, Workbench, WorkbenchPane } from "@/components/tool/Workbench";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { notify } from "@/components/ui/Toast";
import { toToolError, type ToolError } from "@/lib/errors";
import { formatBytes } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
import {
  ALGORITHM_NAMES,
  ALGORITHMS,
  SAMPLE_TEXT,
  WEAK,
  type Algorithm,
  type OutputFormat,
} from "./constants";
import { findMatch, formatDigest, type Digests } from "./format";
// Types only: hash-wasm loads on the first input (architecture §8.2).
import type { HashFileJob, HashFileResult } from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  algorithms: z.array(z.enum(ALGORITHMS)),
  format: z.enum(["hex", "HEX", "base64"]),
  hmac: z.boolean(),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { algorithms: ["sha256"], format: "hex", hmac: false };

const FORMATS = [
  { value: "hex", label: "hex (lowercase)" },
  { value: "HEX", label: "HEX (uppercase)" },
  { value: "base64", label: "Base64" },
];

/** Live update delay after typing (tool-specifications §2.3). */
const DEBOUNCE_MS = 150;

type Outcome =
  | { status: "empty" }
  | { status: "cancelled" }
  | { status: "done"; digests: Digests }
  | { status: "failed"; error: ToolError };

const loadLogic = () => import("./logic");

export default function HashGeneratorUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // The key is content: kept in memory only, never stored (§2.6).
  const [hmacKey, setHmacKey] = useState("");
  const [expected, setExpected] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ status: "empty" });
  const [progress, setProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<ToolError | null>(null);

  const editor = useRef<CodeEditorHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const runner = useRef<WorkerRunner<HashFileJob, HashFileResult> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const fileInputId = useId();

  const algorithms = ALGORITHMS.filter(
    (algorithm) => options.algorithms.includes(algorithm) && !(options.hmac && algorithm === "md5"),
  );
  const key = options.hmac ? hmacKey : null;
  const algorithmKey = algorithms.join(",");

  useEffect(() => () => runner.current?.dispose(), []);

  // A file chosen in the static HTML before hydration fired no React event.
  const onEarlyFile = useEffectEvent((chosen: File) => openFile(chosen));
  useEffect(() => {
    const element = fileInput.current;
    const chosen = element?.files?.[0];
    if (chosen && element) {
      onEarlyFile(chosen);
      element.value = "";
    }
  }, []);

  // Live hashing, debounced. Files go to the worker with progress; a newer
  // input cancels the job in flight.
  useEffect(() => {
    const id = ++sequence.current;
    controller.current?.abort();
    if ((!file && input === "") || algorithmKey === "") return;
    const selected = algorithmKey.split(",") as Algorithm[];
    const timer = setTimeout(async () => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        const logic = await loadLogic();
        let digests: Digests;
        if (file) {
          setProgress(0);
          runner.current ??= createWorkerRunner<HashFileJob, HashFileResult>(
            () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
          );
          // The File is passed by reference; the worker reads it chunk by chunk.
          digests = await runner.current.run(
            { file, algorithms: selected, hmacKey: key },
            {
              signal: abort.signal,
              onProgress: ({ value }) => {
                if (id === sequence.current) setProgress(value);
              },
            },
          );
        } else {
          digests = await logic.hashText(input, selected, key);
        }
        if (id !== sequence.current) return;
        setOutcome({ status: "done", digests });
      } catch (error) {
        if (id !== sequence.current) return;
        const toolError = toToolError(error, "hashing");
        if (toolError.code === "E_CANCELLED") setOutcome({ status: "cancelled" });
        else setOutcome({ status: "failed", error: toolError });
      } finally {
        if (id === sequence.current) setProgress(null);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, file, algorithmKey, key]);

  function openFile(chosen: File) {
    setFileError(null);
    const [check] = checkLimits([chosen], meta.limits, getDeviceClass());
    if (check?.status === "reject") {
      setFileError(check.error);
      return;
    }
    if (check?.status === "warn") notify.warning(check.message);
    setFile(chosen);
  }

  function clear() {
    setInput("");
    setFile(null);
    setFileError(null);
    editor.current?.focus();
  }

  function toggle(algorithm: Algorithm, on: boolean) {
    const next = on
      ? ALGORITHMS.filter((a) => a === algorithm || options.algorithms.includes(a))
      : options.algorithms.filter((a) => a !== algorithm);
    setOptions({ algorithms: next });
  }

  const empty = !file && input === "";
  const current: Outcome = empty || algorithms.length === 0 ? { status: "empty" } : outcome;
  const digests = current.status === "done" ? current.digests : null;
  const working = progress !== null && !empty;
  const shownAlgorithms = digests ? algorithms.filter((algorithm) => digests[algorithm]) : [];
  const match = digests && expected.trim() ? findMatch(expected, digests) : null;

  const inputStatus = file ? (
    <span>{formatBytes(file.size)} file</span>
  ) : empty ? (
    <span>Type or paste text, or open a file.</span>
  ) : current.status === "cancelled" ? (
    <span>Cancelled. Edit the input to try again.</span>
  ) : (
    <span className="font-mono tabular-nums">
      {formatBytes(new TextEncoder().encode(input).length)} of UTF-8 text
    </span>
  );

  return (
    <Workbench
      toolbar={
        <>
          <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <legend className="sr-only">Algorithms</legend>
            {ALGORITHMS.map((algorithm) => (
              <Checkbox
                key={algorithm}
                label={ALGORITHM_NAMES[algorithm]}
                checked={options.algorithms.includes(algorithm)}
                disabled={options.hmac && algorithm === "md5"}
                onCheckedChange={(checked) => toggle(algorithm, checked === true)}
              />
            ))}
          </fieldset>
          <ToolbarGroup>
            <div className="w-44">
              <Select
                aria-label="Output format"
                options={FORMATS}
                value={options.format}
                onValueChange={(value) => setOptions({ format: value as OutputFormat })}
              />
            </div>
            <Switch
              label="HMAC"
              checked={options.hmac}
              onCheckedChange={(hmac) => setOptions({ hmac })}
            />
          </ToolbarGroup>
          {options.hmac && (
            <Field
              label="HMAC key"
              description="Text, used as UTF-8. Not stored. MD5 isn’t available with HMAC."
              className="w-full"
            >
              <Input
                value={hmacKey}
                onChange={(event) => setHmacKey(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </Field>
          )}
        </>
      }
      footer={
        (working || fileError || current.status === "failed") && (
          <>
            {working && (
              <ProcessingState
                label="Hashing"
                value={progress ?? undefined}
                detail={`Hashing ${file ? formatBytes(file.size) : "the text"}…`}
                onCancel={() => controller.current?.abort()}
                delayMs={300}
              />
            )}
            {fileError && (
              <ErrorState title="The file couldn’t be opened" description={fileError.message} />
            )}
            {current.status === "failed" && (
              <ErrorState
                title="Hashing failed"
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
                setInput(SAMPLE_TEXT);
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
                className="peer sr-only"
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  if (chosen) openFile(chosen);
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
              disabled={empty}
            />
          </>
        }
        status={<span role="status">{inputStatus}</span>}
      >
        {file ? (
          <div className="flex h-full items-center p-4">
            <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 p-4">
              <FileIcon aria-hidden className="size-6 shrink-0 text-fg-muted" />
              <div className="flex min-w-0 grow flex-col">
                <p className="truncate text-ui text-fg">{file.name}</p>
                <p className="text-small text-fg-muted">{formatBytes(file.size)}</p>
              </div>
              <IconButton
                label={`Remove ${file.name}`}
                icon={<X aria-hidden />}
                size="sm"
                onClick={clear}
              />
            </div>
          </div>
        ) : (
          <CodeEditor
            ref={editor}
            value={input}
            onChange={setInput}
            label="Text to hash"
            language="text"
            wrap
            placeholder="Text to hash"
          />
        )}
      </WorkbenchPane>

      <WorkbenchPane
        title={options.hmac ? "HMAC" : "Hashes"}
        status={
          digests && expected.trim() ? (
            match ? (
              <span role="status" className="inline-flex items-center gap-1.5 text-success">
                <CircleCheck aria-hidden className="size-4" />
                Matches {ALGORITHM_NAMES[match]}
              </span>
            ) : (
              <span role="status" className="inline-flex items-center gap-1.5 text-danger">
                <CircleX aria-hidden className="size-4" />
                No match
              </span>
            )
          ) : (
            <span role="status">
              {digests && shownAlgorithms.length > 0
                ? `${shownAlgorithms.map((a) => ALGORITHM_NAMES[a]).join(", ")} ready`
                : ""}
            </span>
          )
        }
      >
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 md:p-4">
          <Field label="Compare with expected hash" description="Paste a checksum to check it.">
            <Input
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. from the download page"
              className="font-mono"
            />
          </Field>
          {algorithms.length === 0 ? (
            <EmptyState
              title="Choose an algorithm"
              description="Select at least one of MD5, SHA-1, SHA-256, SHA-384 or SHA-512 above."
            />
          ) : digests ? (
            <>
              <ResultList
                rows={shownAlgorithms.map((algorithm) => ({
                  label: `${options.hmac ? "HMAC-" : ""}${ALGORITHM_NAMES[algorithm]}`,
                  value: formatDigest(digests[algorithm]!, options.format),
                  note:
                    match === algorithm
                      ? "match"
                      : WEAK.includes(algorithm)
                        ? "checksums only"
                        : undefined,
                }))}
              />
              {shownAlgorithms.some((algorithm) => WEAK.includes(algorithm)) && (
                <p className="text-small text-fg-muted">
                  MD5 and SHA-1 are not secure for passwords or signatures; they are fine for
                  checksums.
                </p>
              )}
            </>
          ) : (
            <EmptyState
              title="Nothing to show yet"
              description="Type text or open a file. Its hashes appear here."
              action={
                empty && (
                  <Button size="sm" onClick={() => setInput(SAMPLE_TEXT)}>
                    Insert sample
                  </Button>
                )
              }
            />
          )}
        </div>
      </WorkbenchPane>
    </Workbench>
  );
}
