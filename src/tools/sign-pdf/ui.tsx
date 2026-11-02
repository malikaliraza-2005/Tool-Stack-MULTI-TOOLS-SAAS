"use client";

import { CalendarDays, Check, Download, PenLine, RotateCcw, ShieldAlert, Type } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as z from "zod/mini";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { FileList, type FileListItem } from "@/components/tool/FileList";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { notify } from "@/components/ui/Toast";
import { toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { downloadBlob } from "@/lib/files/download";
import { plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { baseName, sanitizeFileName } from "@/lib/files/names";
import { readAsArrayBuffer } from "@/lib/files/read";
import { describeKind, sniffFile } from "@/lib/files/sniff";
import type { PdfPreview } from "@/lib/pdf/render";
import { createWorkerRunner, type WorkerRunner } from "@/lib/worker/runner";
import { clampRect, viewSize, type Rect } from "./geometry";
// Types only: pdf-lib stays in the worker chunk.
import type { FieldValues, FormField, PdfInfo, SignItem, SignJob, SignJobResult } from "./logic";
import { meta } from "./meta";
import { ITEM_NAMES, PageView, type Item, type ItemKind } from "./PageView";
import { SignatureDialog } from "./SignatureDialog";
import { measureText, textImage, type SignatureImage } from "./signature";
import { DEFAULT_FONT_SIZE, TEXT_LINE_HEIGHT, unencodable } from "./text";
import { UseInAnotherTool } from "@/components/tool/UseInAnotherTool";

const optionsSchema = z.object({ flatten: z.boolean() });
const DEFAULTS = { flatten: true };

const LIMITS_HINT = "One PDF · up to 500 MB (150 MB on phones and tablets)";
export const DISCLAIMER =
  "This adds a visual signature. It is not a certified digital signature. Check whether the recipient accepts electronic signatures.";
/** Default height of a new signature, in points. */
const SIGNATURE_HEIGHT = 44;
const CHECK_SIZE = 16;

type Source = { file: File; status: "checking" | "ready" | "error"; error?: string };
type Result = { blob: Blob; name: string };
type Phase = "idle" | "saving" | "done";

const createRunner = () =>
  createWorkerRunner<SignJob, SignJobResult>(
    () => new Worker(new URL("./logic.worker.ts", import.meta.url), { type: "module" }),
  );

const outputName = (name: string) => `${sanitizeFileName(baseName(name)) || "document"}-signed.pdf`;
const today = () => new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
const textRect = (text: string, size: number) => ({
  width: Math.max(measureText(text || " ", size), size),
  height: size * TEXT_LINE_HEIGHT,
});

export default function SignPdfUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [source, setSource] = useState<Source | null>(null);
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [values, setValues] = useState<FieldValues>({});
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [saveError, setSaveError] = useState<ToolError | null>(null);
  const [progress, setProgress] = useState<{ value: number; label?: string }>({ value: 0 });
  const [alert, setAlert] = useState("");
  const [status, setStatus] = useState("");

  const runner = useRef<WorkerRunner<SignJob, SignJobResult> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const current = useRef<File | null>(null);
  const openPreview = useRef<PdfPreview | null>(null);
  const signatures = useRef(new Set<string>());
  const pages = useRef<HTMLDivElement>(null);
  const focusItem = useRef<string | null>(null);
  const dropZone = useRef<DropZoneHandle>(null);
  const focusDropZone = useRef(false);
  const nextId = useRef(0);
  const hintId = useId();
  const itemHintId = useId();

  useEffect(
    () => () => {
      runner.current?.dispose();
      void openPreview.current?.destroy();
      for (const url of signatures.current) URL.revokeObjectURL(url);
    },
    [],
  );

  useEffect(() => {
    if (focusDropZone.current) {
      focusDropZone.current = false;
      dropZone.current?.focus();
    }
    if (focusItem.current) {
      const id = focusItem.current;
      focusItem.current = null;
      document.querySelector<HTMLElement>(`[data-item-id="${id}"] button`)?.focus();
    }
  });

  function invalidateResult() {
    setResult(null);
    setSaveError(null);
    setPhase((value) => (value === "done" ? "idle" : value));
  }

  function reset() {
    abort.current?.abort();
    void openPreview.current?.destroy();
    openPreview.current = null;
    setPreview(null);
    setInfo(null);
    setValues({});
    setItems([]);
    setSelectedId(null);
    setActiveField(null);
    setResult(null);
    setSaveError(null);
    setPhase("idle");
  }

  async function addFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    reset();
    current.current = file;
    const [check] = checkLimits([file], meta.limits, getDeviceClass());
    if (check?.status === "reject") {
      setSource({ file, status: "error", error: check.error.message });
      setAlert(check.error.message);
      return;
    }
    if (check?.status === "warn") notify.warning(check.message);
    setSource({ file, status: "checking" });
    try {
      const kind = await sniffFile(file);
      if (kind !== "pdf") {
        throw toolErrors.unsupportedFormat({
          name: file.name,
          detected: kind ? describeKind(kind) : undefined,
          tool: meta.name,
          formats: "PDF files",
        });
      }
      const bytes = await readAsArrayBuffer(file);
      runner.current ??= createRunner();
      const checked = await runner.current.run(
        { op: "inspect", file: { name: file.name, bytes: bytes.slice(0) } },
        { transfer: [] },
      );
      if (current.current !== file || checked.op !== "inspect") return;
      setInfo(checked.info);
      setValues(Object.fromEntries(checked.info.fields.map((field) => [field.name, field.value])));
      setSource({ file, status: "ready" });
      // Page images: pdf.js loads now that the file is known to be a good PDF.
      const { openPdfPreview } = await import("@/lib/pdf/render");
      const opened = await openPdfPreview(new Uint8Array(bytes)).catch(() => null);
      if (current.current !== file) {
        void opened?.destroy();
        return;
      }
      openPreview.current = opened;
      setPreview(opened);
    } catch (error) {
      if (current.current !== file) return;
      const toolError = toToolError(error, "checking the file");
      setSource({ file, status: "error", error: toolError.message });
      setAlert(toolError.message);
    }
  }

  function startOver() {
    reset();
    current.current = null;
    setSource(null);
    focusDropZone.current = true;
  }

  /** The page nearest the middle of the screen: where new items go. */
  function currentPage(): number {
    const elements = pages.current?.querySelectorAll<HTMLElement>("[data-page]") ?? [];
    const middle = window.innerHeight / 2;
    let best = 0;
    let distance = Infinity;
    for (const element of elements) {
      const box = element.getBoundingClientRect();
      const d = box.top > middle ? box.top - middle : box.bottom < middle ? middle - box.bottom : 0;
      if (d < distance) {
        distance = d;
        best = Number(element.dataset.page);
      }
    }
    return best;
  }

  function place(kind: ItemKind, size: { width: number; height: number }, extra: Partial<Item>) {
    if (!info) return;
    const page = currentPage();
    const box = info.pages[page]!;
    const view = viewSize(box);
    // Centred where the page meets the middle of the screen.
    const element = pages.current?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    let centerY = view.height / 2;
    if (element) {
      const rect = element.getBoundingClientRect();
      const ratio = (window.innerHeight / 2 - rect.top) / rect.height;
      centerY = Math.min(Math.max(ratio, 0.1), 0.9) * view.height;
    }
    const width = Math.min(size.width, view.width * 0.8);
    const height = (size.height * width) / size.width;
    const rect = clampRect(
      { x: (view.width - width) / 2, y: centerY - height / 2, width, height },
      view.width,
      view.height,
    );
    const id = `item-${nextId.current++}`;
    setItems((list) => [...list, { id, kind, page, rect, ...extra }]);
    setSelectedId(id);
    focusItem.current = id;
    invalidateResult();
    setStatus(
      `${ITEM_NAMES[kind]} added to page ${page + 1}. Drag it, or use the arrow keys to move it.`,
    );
  }

  function openDialog() {
    setDialogKey((key) => key + 1);
    setDialogOpen(true);
  }

  function addSignature(signature: SignatureImage) {
    signatures.current.add(signature.url);
    const aspect = signature.width / signature.height;
    place(
      "signature",
      { width: SIGNATURE_HEIGHT * aspect, height: SIGNATURE_HEIGHT },
      { image: signature },
    );
  }

  function addText(kind: "text" | "date") {
    const text = kind === "date" ? today() : "Text";
    place(kind, textRect(text, DEFAULT_FONT_SIZE), { text });
  }

  const changeRect = useCallback((id: string, rect: Rect) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, rect } : item)));
    invalidateResult();
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((list) => {
      const item = list.find((i) => i.id === id);
      if (item) setStatus(`${ITEM_NAMES[item.kind]} removed from page ${item.page + 1}.`);
      return list.filter((i) => i.id !== id);
    });
    setSelectedId((value) => (value === id ? null : value));
    invalidateResult();
  }, []);

  function setItemText(id: string, text: string) {
    setItems((list) =>
      list.map((item) => {
        if (item.id !== id || !info) return item;
        const size = item.rect.height / TEXT_LINE_HEIGHT;
        const view = viewSize(info.pages[item.page]!);
        const rect = clampRect({ ...item.rect, ...textRect(text, size) }, view.width, view.height);
        return { ...item, text, rect };
      }),
    );
    invalidateResult();
  }

  function setField(name: string, value: string | boolean | null) {
    setValues((all) => ({ ...all, [name]: value }));
    invalidateResult();
  }

  function showField(name: string) {
    setActiveField(name);
    // On wide screens the panel stays put, so the page can scroll to the field.
    if (!window.matchMedia("(min-width: 64rem)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .querySelector(`[data-field-widget="${CSS.escape(name)}"]`)
      ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }

  const byPage = useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const item of items) map.set(item.page, [...(map.get(item.page) ?? []), item]);
    return map;
  }, [items]);

  const fields = useMemo(() => (info && !info.xfa ? info.fields : []), [info]);
  const changedFields = useMemo(() => {
    const changed: FieldValues = {};
    for (const field of fields) {
      if (values[field.name] !== field.value) changed[field.name] = values[field.name] ?? null;
    }
    return changed;
  }, [fields, values]);
  const changes = items.length + Object.keys(changedFields).length;
  const canSave = source?.status === "ready" && changes > 0 && phase !== "saving";

  async function save() {
    if (!canSave || !source) return;
    abort.current = new AbortController();
    setSaveError(null);
    setPhase("saving");
    setProgress({ value: 0 });
    try {
      const signItems: SignItem[] = [];
      const transfer: ArrayBuffer[] = [];
      for (const item of items) {
        const { page, rect } = item;
        if (item.kind === "check") {
          signItems.push({ kind: "check", page, rect });
        } else if (item.kind === "signature" && item.image) {
          const png = await item.image.blob.arrayBuffer();
          transfer.push(png);
          signItems.push({ kind: "image", page, rect, png });
        } else if (item.text?.trim()) {
          // The PDF's standard font only covers Western European text.
          if (unencodable(item.text).length === 0) {
            signItems.push({ kind: "text", page, rect, text: item.text });
          } else {
            const blob = await textImage(item.text, rect.height / TEXT_LINE_HEIGHT);
            const png = await blob.arrayBuffer();
            transfer.push(png);
            signItems.push({ kind: "image", page, rect, png });
          }
        }
      }
      const bytes = await readAsArrayBuffer(source.file);
      transfer.push(bytes);
      runner.current ??= createRunner();
      const output = await runner.current.run(
        {
          op: "sign",
          file: { name: source.file.name, bytes },
          fields: changedFields,
          items: signItems,
          flatten: options.flatten,
        },
        {
          transfer,
          signal: abort.current.signal,
          onProgress: setProgress,
        },
      );
      if (output.op !== "sign") return;
      setResult({
        blob: new Blob([output.bytes], { type: "application/pdf" }),
        name: outputName(source.file.name),
      });
      setPhase("done");
    } catch (error) {
      const toolError = toToolError(error, "signing the PDF");
      setPhase("idle");
      if (toolError.code === "E_CANCELLED") return;
      setSaveError(toolError);
      setAlert(toolError.message);
    }
  }

  if (!source) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <DropZone
          ref={dropZone}
          accept={meta.input.accepts!}
          acceptLabel="PDF files"
          multiple={false}
          onFiles={addFiles}
          title="Drop a PDF here"
          description="Or choose one from your device. Your file stays on this device."
          hint={LIMITS_HINT}
          buttonLabel="Choose file"
        />
        <p className="flex items-start gap-2 text-small text-fg-muted">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {DISCLAIMER}
        </p>
        <p role="alert" className="sr-only">
          {alert}
        </p>
      </div>
    );
  }

  const fileItem: FileListItem = {
    id: "source",
    name: source.file.name,
    size: source.file.size,
    type: "PDF",
    meta: info ? plural(info.pages.length, "page") : undefined,
    busy: source.status === "checking",
    status: source.error ? { tone: "error", message: source.error } : undefined,
  };
  const busy = phase === "saving";
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const ready = source.status === "ready" && info !== null;

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui text-fg">File</h2>
          <Button variant="ghost" size="sm" onClick={startOver} disabled={busy}>
            <RotateCcw aria-hidden />
            Choose another
          </Button>
        </div>
        <FileList
          items={[fileItem]}
          label="PDF to sign"
          onRemove={startOver}
          onEmptied={() => (focusDropZone.current = true)}
        />

        {ready && (
          <>
            <div
              role="toolbar"
              aria-label="Add to the page"
              className="sticky top-(--header-height) z-30 -mx-1 flex flex-wrap gap-2 bg-surface px-1 py-2"
            >
              <Button variant="primary" size="sm" onClick={openDialog} disabled={busy}>
                <PenLine aria-hidden />
                Add signature
              </Button>
              <Button variant="secondary" size="sm" onClick={() => addText("text")} disabled={busy}>
                <Type aria-hidden />
                Text
              </Button>
              <Button variant="secondary" size="sm" onClick={() => addText("date")} disabled={busy}>
                <CalendarDays aria-hidden />
                Date
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => place("check", { width: CHECK_SIZE, height: CHECK_SIZE }, {})}
                disabled={busy}
              >
                <Check aria-hidden />
                Checkmark
              </Button>
            </div>
            <p id={itemHintId} className="sr-only">
              Arrow keys move it (with Shift, 10 points at a time). Plus and minus resize it. Delete
              removes it.
            </p>
            <div ref={pages} className="flex flex-col gap-6 rounded-md bg-surface-2 p-3 sm:p-6">
              {info.pages.map((box, index) => (
                <PageView
                  key={index}
                  index={index}
                  box={box}
                  preview={preview}
                  fields={fields}
                  values={values}
                  activeField={activeField}
                  items={byPage.get(index) ?? []}
                  selectedId={selectedId}
                  hintId={itemHintId}
                  onSelect={setSelectedId}
                  onChange={changeRect}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <aside
        aria-label="Fill and sign"
        className="flex flex-col gap-5 lg:sticky lg:top-(--header-height) lg:max-h-(--sheet-max-height) lg:self-start lg:overflow-y-auto lg:border-l lg:border-border lg:pl-6"
      >
        <p className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3 text-small text-fg">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" />
          <span>{DISCLAIMER}</span>
        </p>

        {selected && (selected.kind === "text" || selected.kind === "date") && (
          <Field label={`${ITEM_NAMES[selected.kind]} on page ${selected.page + 1}`}>
            <Input
              value={selected.text ?? ""}
              onChange={(event) => setItemText(selected.id, event.target.value)}
              maxLength={200}
              autoComplete="off"
            />
          </Field>
        )}

        {info?.xfa && (
          <p
            role="note"
            className="rounded-md border border-warning bg-warning-soft p-3 text-small text-fg"
          >
            This PDF uses an XFA form (made with Adobe LiveCycle), which isn’t supported, so its
            fields can’t be filled here. You can still add a signature, text, dates and checkmarks.
          </p>
        )}

        {fields.length > 0 && (
          <section aria-labelledby={`${hintId}-fields`} className="flex flex-col gap-3">
            <h2 id={`${hintId}-fields`} className="text-ui text-fg">
              Form fields <span className="text-fg-muted">({fields.length})</span>
            </h2>
            {fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name] ?? null}
                disabled={busy}
                onChange={(value) => setField(field.name, value)}
                onFocus={() => showField(field.name)}
              />
            ))}
          </section>
        )}

        {ready && (
          <Switch
            label="Flatten (fields can’t be edited afterwards)"
            checked={options.flatten}
            disabled={busy}
            onCheckedChange={(flatten) => {
              setOptions({ flatten });
              invalidateResult();
            }}
          />
        )}

        {busy && (
          <ProcessingState
            label="Saving the PDF"
            value={progress.value}
            detail={progress.label}
            onCancel={() => abort.current?.abort()}
            focusCancel
          />
        )}

        {phase === "done" && result && (
          <ResultPanel
            title={`${result.name} is ready`}
            summary={[
              plural(items.length, "item") + " placed",
              plural(Object.keys(changedFields).length, "field") + " filled",
            ]}
            primary={
              <Button variant="primary" onClick={() => downloadBlob(result.blob, result.name)}>
                <Download aria-hidden />
                Download PDF
              </Button>
            }
            secondary={
              <>
                <UseInAnotherTool outputs={[result]} />
                <Button variant="secondary" onClick={startOver}>
                  Start over
                </Button>
              </>
            }
          />
        )}

        {phase === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              aria-disabled={!canSave || undefined}
              aria-describedby={hintId}
              onClick={save}
            >
              Save signed PDF
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {source.status === "checking"
                ? "Checking the file…"
                : source.status === "error"
                  ? "Choose another PDF."
                  : changes === 0
                    ? "Add a signature, text or checkmark, or fill in a field."
                    : "Your file stays on this device."}
            </p>
          </div>
        )}

        {saveError && (
          <ErrorState
            title="The PDF couldn’t be saved"
            description={saveError.message}
            action={
              saveError.details ? (
                <details className="text-small text-fg-muted">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-1 font-mono break-all">{saveError.details}</p>
                </details>
              ) : undefined
            }
          />
        )}
      </aside>

      <SignatureDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={addSignature}
      />
      <p role="alert" className="sr-only">
        {alert}
      </p>
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
  onFocus,
}: {
  field: FormField;
  value: string | boolean | null;
  disabled: boolean;
  onChange: (value: string | boolean | null) => void;
  onFocus: () => void;
}) {
  const off = disabled || field.readOnly;
  const note = field.readOnly ? "Read-only" : undefined;
  if (field.kind === "checkbox") {
    return (
      <div onFocus={onFocus}>
        <Checkbox
          label={field.label}
          checked={value === true}
          disabled={off}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      </div>
    );
  }
  if (field.kind === "radio") {
    return (
      <fieldset className="flex flex-col gap-2" disabled={off} onFocus={onFocus}>
        <legend className="mb-2 text-ui text-fg">{field.label}</legend>
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={onChange}
          aria-label={field.label}
        >
          {(field.options ?? []).map((option) => (
            <Radio key={option} value={option} label={option} />
          ))}
        </RadioGroup>
      </fieldset>
    );
  }
  if (field.kind === "dropdown") {
    return (
      <div onFocus={onFocus}>
        <Field label={field.label} description={note}>
          <Select
            options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
            value={typeof value === "string" ? value : undefined}
            onValueChange={onChange}
            placeholder="Choose…"
            disabled={off}
          />
        </Field>
      </div>
    );
  }
  if (field.kind === "text") {
    const Control = field.multiline ? Textarea : Input;
    return (
      <Field label={field.label} description={note}>
        <Control
          value={typeof value === "string" ? value : ""}
          onChange={(event: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange(event.target.value)
          }
          onFocus={onFocus}
          maxLength={field.maxLength}
          disabled={off}
          autoComplete="off"
        />
      </Field>
    );
  }
  return (
    <p className="text-small text-fg-muted">
      <span className="text-fg">{field.label}</span>: a button or signature field, which can’t be
      filled here.
    </p>
  );
}
