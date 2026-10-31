"use client";

import { ArrowLeftRight, CircleAlert, CircleCheck, Download, Eraser, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import * as z from "zod/mini";
import { CodeEditor, type CodeEditorHandle } from "@/components/tool/CodeEditor";
import { ResultList, type ResultRow } from "@/components/tool/ResultList";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { ToolbarGroup, Workbench, WorkbenchPane } from "@/components/tool/Workbench";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { toolErrors } from "@/lib/errors";
import { downloadText } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { SAMPLES } from "./constants";
// Types only: the codec loads on the first input (architecture §8.2).
import type { InputError, ParsedUrl, ParseResult, TextResult } from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  mode: z.enum(["encode", "decode", "parse"]),
  scope: z.enum(["component", "full"]),
  plusForSpace: z.boolean(),
  plusAsSpace: z.boolean(),
});
type Options = z.infer<typeof optionsSchema>;
type Mode = Options["mode"];
const DEFAULTS: Options = {
  mode: "encode",
  scope: "component",
  plusForSpace: false,
  plusAsSpace: false,
};

const MODES = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
  { value: "parse", label: "Parse" },
];
const SCOPES = [
  { value: "component", label: "Component" },
  { value: "full", label: "Full URL" },
];

const INPUT_LABELS: Record<Mode, string> = {
  encode: "Text to encode",
  decode: "Text to decode",
  parse: "URL to parse",
};
const PLACEHOLDERS: Record<Mode, string> = {
  encode: "Text or a URL to encode",
  decode: "caf%C3%A9%20au%20lait",
  parse: "https://example.com/path?query=value#fragment",
};

/** Live update delay after typing (tool-specifications §2.3). */
const DEBOUNCE_MS = 150;

type Outcome =
  | { status: "empty" }
  | { status: "text"; mode: "encode" | "decode"; result: TextResult }
  | { status: "parse"; result: ParseResult }
  | { status: "too-large"; message: string };

const loadLogic = () => import("./logic");

export default function UrlEncodeDecodeUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [input, setInput] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ status: "empty" });
  const editor = useRef<CodeEditorHandle>(null);
  const sequence = useRef(0);
  const errorId = useId();
  const { mode } = options;

  // Live processing, debounced. Everything is fast enough for the main thread.
  useEffect(() => {
    const id = ++sequence.current;
    if (input.trim() === "") return;
    const timer = setTimeout(async () => {
      let next: Outcome;
      if (input.length > meta.limits.desktop.hardBytes) {
        next = {
          status: "too-large",
          message: toolErrors.tooLarge({
            name: "The input",
            size: input.length,
            limit: meta.limits.desktop.hardBytes,
            suggestion: "a shorter text",
          }).message,
        };
      } else {
        const logic = await loadLogic();
        next =
          mode === "parse"
            ? { status: "parse", result: logic.parseUrl(input) }
            : mode === "encode"
              ? {
                  status: "text",
                  mode,
                  result: logic.encode(input, {
                    scope: options.scope,
                    plusForSpace: options.plusForSpace,
                  }),
                }
              : {
                  status: "text",
                  mode,
                  result: logic.decode(input, { plusAsSpace: options.plusAsSpace }),
                };
      }
      if (id === sequence.current) setOutcome(next);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, mode, options.scope, options.plusForSpace, options.plusAsSpace]);

  const empty = input.trim() === "";
  const current: Outcome = empty ? { status: "empty" } : outcome;
  // A result from another mode (before the new one is ready) isn't shown.
  const textResult = current.status === "text" && current.mode === mode ? current.result : null;
  const parseResult = current.status === "parse" && mode === "parse" ? current.result : null;
  const output = textResult?.ok ? textResult.output : null;
  const parsed = parseResult?.ok ? parseResult.url : null;
  const inputError: InputError | null =
    (textResult && !textResult.ok ? textResult.error : null) ??
    (parseResult && !parseResult.ok ? parseResult.error : null);
  const pending = !empty && !textResult && !parseResult && current.status !== "too-large";

  function clear() {
    setInput("");
    editor.current?.focus();
  }

  function swap() {
    if (output === null || mode === "parse") return;
    setInput(output);
    setOptions({ mode: mode === "encode" ? "decode" : "encode" });
  }

  const inputStatus = (() => {
    if (empty) {
      return <span>{mode === "parse" ? "Paste a URL." : `Type or paste text to ${mode}.`}</span>;
    }
    if (pending) return <span>Checking…</span>;
    if (inputError) {
      return (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <CircleAlert aria-hidden className="size-4" />
          {mode === "parse" ? "Invalid URL" : "Can’t " + mode}: line {inputError.line}, column{" "}
          {inputError.column}
        </span>
      );
    }
    if (parsed) {
      return (
        <span className="inline-flex items-center gap-1.5 text-success">
          <CircleCheck aria-hidden className="size-4" />
          Valid URL
        </span>
      );
    }
    return (
      <span className="font-mono tabular-nums">
        {plural(input.length, "character")}
        {input.length > meta.limits.desktop.softBytes && " · Large input, may be slow"}
      </span>
    );
  })();

  return (
    <Workbench
      toolbar={
        <>
          <SegmentedControl
            label="Mode"
            options={MODES}
            value={mode}
            onValueChange={(next) => setOptions({ mode: next as Mode })}
          />
          <ToolbarGroup>
            {mode === "encode" && (
              <>
                <div className="w-36">
                  <Select
                    aria-label="Encode as"
                    options={SCOPES}
                    value={options.scope}
                    onValueChange={(scope) => setOptions({ scope: scope as Options["scope"] })}
                  />
                </div>
                <Switch
                  label="Space as +"
                  checked={options.plusForSpace && options.scope === "component"}
                  disabled={options.scope === "full"}
                  onCheckedChange={(plusForSpace) => setOptions({ plusForSpace })}
                />
              </>
            )}
            {mode === "decode" && (
              <Switch
                label="+ as space"
                checked={options.plusAsSpace}
                onCheckedChange={(plusAsSpace) => setOptions({ plusAsSpace })}
              />
            )}
            {mode !== "parse" && (
              <Button variant="ghost" size="sm" onClick={swap} disabled={output === null}>
                <ArrowLeftRight aria-hidden />
                Swap
              </Button>
            )}
          </ToolbarGroup>
        </>
      }
      footer={
        (inputError || current.status === "too-large") && (
          <>
            {current.status === "too-large" && (
              <ErrorState title="The input is too large" description={current.message} />
            )}
            {inputError && (
              <div id={errorId}>
                <ErrorState
                  title={mode === "parse" ? "Invalid URL" : `The text can’t be ${mode}d`}
                  description={`Line ${inputError.line}, column ${inputError.column}: ${inputError.message}`}
                  action={
                    <Button size="sm" onClick={() => editor.current?.focusAt(inputError.offset)}>
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
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLES[mode])}>
              <Sparkles aria-hidden />
              Sample
            </Button>
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
          // The label and placeholder differ by mode; CodeMirror sets them once.
          key={mode}
          ref={editor}
          value={input}
          onChange={setInput}
          label={INPUT_LABELS[mode]}
          language="text"
          wrap
          placeholder={PLACEHOLDERS[mode]}
          errorOffset={inputError?.offset ?? null}
          describedBy={inputError ? errorId : undefined}
          invalid={Boolean(inputError)}
        />
      </WorkbenchPane>

      <WorkbenchPane
        title={mode === "parse" ? "Parts" : "Output"}
        actions={
          mode !== "parse" && (
            <>
              <CopyButton
                value={() => output ?? ""}
                label="Copy"
                variant="ghost"
                size="sm"
                disabled={output === null}
              />
              <IconButton
                label={`Download ${mode}d.txt`}
                icon={<Download aria-hidden />}
                size="sm"
                disabled={output === null}
                onClick={() => output !== null && downloadText(output, `${mode}d.txt`)}
              />
            </>
          )
        }
        status={
          output !== null ? (
            <span className="font-mono tabular-nums">
              {plural(output.length, "character")} · {formatBytes(new Blob([output]).size)}
            </span>
          ) : parsed ? (
            <span>{plural(parsed.params.length, "query parameter")}</span>
          ) : null
        }
      >
        {parsed ? (
          <UrlParts url={parsed} />
        ) : output !== null ? (
          <CodeEditor
            key={mode}
            value={output}
            label={mode === "encode" ? "Encoded output" : "Decoded output"}
            language="text"
            wrap
            readOnly
          />
        ) : (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              title={inputError ? "Fix the error to see the output" : "Nothing to show yet"}
              description={
                inputError
                  ? "The first problem is highlighted in the input."
                  : mode === "parse"
                    ? "Paste a URL. Its scheme, host, path, query parameters and fragment appear here."
                    : `Type or paste text. The ${mode}d result appears here.`
              }
              action={
                !inputError &&
                empty && (
                  <Button size="sm" onClick={() => setInput(SAMPLES[mode])}>
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

function UrlParts({ url }: { url: ParsedUrl }) {
  const rows: ResultRow[] = [
    { label: "Scheme", value: url.protocol },
    ...(url.username ? [{ label: "Username", value: url.username }] : []),
    // Shown masked; Copy still copies the real password.
    ...(url.password ? [{ label: "Password", value: url.password, shown: "••••••••" }] : []),
    ...(url.hostname ? [{ label: "Host", value: url.hostname }] : []),
    ...(url.hostnameUnicode ? [{ label: "Host (Unicode)", value: url.hostnameUnicode }] : []),
    ...(url.port
      ? [{ label: "Port", value: url.port }]
      : url.defaultPort
        ? [{ label: "Port", value: url.defaultPort, note: "default" }]
        : []),
    ...(url.origin ? [{ label: "Origin", value: url.origin }] : []),
    { label: "Path", value: url.pathname },
    ...(url.pathnameDecoded ? [{ label: "Path (decoded)", value: url.pathnameDecoded }] : []),
    ...(url.search ? [{ label: "Query string", value: url.search }] : []),
    ...(url.hash ? [{ label: "Fragment", value: url.hash }] : []),
  ];
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 md:p-4">
      <ResultList rows={rows} />
      {url.params.length > 0 && (
        <table className="w-full table-fixed border-separate border-spacing-0 rounded-md border border-border text-left">
          <caption className="pb-2 text-left text-ui text-fg">
            Query parameters ({url.params.length})
          </caption>
          <thead>
            <tr className="text-small text-fg-muted">
              <th scope="col" className="w-2/5 border-b border-border px-3 py-2 font-normal">
                Key
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 font-normal">
                Value (decoded)
              </th>
            </tr>
          </thead>
          <tbody>
            {url.params.map((param, index) => (
              <tr key={index} className="align-top">
                <td className="border-b border-border px-3 py-2 font-mono text-code break-all text-fg">
                  <span className="flex flex-wrap items-center gap-2">
                    {param.key}
                    {param.repeated && <Badge tone="info">repeated</Badge>}
                  </span>
                </td>
                <td className="border-b border-border px-3 py-1">
                  <span className="flex min-h-8 items-center justify-between gap-3">
                    <span className="min-w-0 font-mono text-code break-all text-fg">
                      {param.value || <span className="text-fg-subtle">(empty)</span>}
                    </span>
                    <CopyButton
                      value={param.value}
                      label={`Copy value of ${param.key} (${index + 1})`}
                      iconOnly
                      variant="ghost"
                      size="sm"
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
