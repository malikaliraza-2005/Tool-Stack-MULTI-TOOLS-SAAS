"use client";

import { Download, FileArchive, Info, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as z from "zod/mini";
import { DropZone, type DropZoneHandle } from "@/components/tool/DropZone";
import { FileList, type FileListItem } from "@/components/tool/FileList";
import { ProcessingState } from "@/components/tool/ProcessingState";
import { ResultPanel } from "@/components/tool/ResultPanel";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { notify } from "@/components/ui/Toast";
import { isToolError, toolErrors, toToolError, type ToolError } from "@/lib/errors";
import { downloadBlob } from "@/lib/files/download";
import { formatBytes, plural } from "@/lib/files/format";
import { checkLimits, getDeviceClass } from "@/lib/files/limits";
import { readAsArrayBuffer } from "@/lib/files/read";
import { describeKind, sniffFile } from "@/lib/files/sniff";
import { parsePageRange } from "@/lib/pdf/page-range";
import type { PdfRenderer } from "@/lib/pdf/render";
import { meta } from "./meta";
import { imageName, MAX_PIXELS, renderSize, zipName, type Dpi, type ImageFormat } from "./plan";

const optionsSchema = z.object({
  format: z.enum(["jpg", "png"]),
  dpi: z.enum(["72", "150", "300"]),
  pages: z.enum(["all", "range"]),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = { format: "jpg", dpi: "150", pages: "all" };

const FORMATS = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
];
const DPIS = [
  { value: "72", label: "72 DPI" },
  { value: "150", label: "150 DPI" },
  { value: "300", label: "300 DPI" },
];

const JPEG_QUALITY = 0.9;
const THUMBNAIL_SCALE = 0.12;
const LIMITS_HINT = "One PDF · up to 500 MB (150 MB on phones and tablets)";
/** Images listed individually; all are always in the ZIP. */
const LIST_LIMIT = 100;

type Source = {
  file: File;
  status: "checking" | "ready" | "error";
  pageCount?: number;
  error?: string;
  warning?: string;
  thumbnail?: string;
};
type OutputImage = {
  name: string;
  blob: Blob;
  width: number;
  height: number;
  dpi: number;
  downscaled: boolean;
};
type Result = { images: OutputImage[]; zip: Blob | null; zipName: string };
type Phase = "idle" | "converting" | "done";

const ENCRYPT = new TextEncoder().encode("/Encrypt");

/** Whether the bytes contain `/Encrypt`, searched in chunks to keep memory flat. */
function declaresEncryption(bytes: Uint8Array): boolean {
  const decoder = new TextDecoder("latin1");
  const chunk = 8 * 2 ** 20;
  for (let start = 0; start < bytes.length; start += chunk) {
    // Overlap so a match across a chunk boundary is found.
    const end = Math.min(bytes.length, start + chunk + ENCRYPT.length);
    if (decoder.decode(bytes.subarray(start, end)).includes("/Encrypt")) return true;
  }
  return false;
}

/**
 * pdf.js errors as ToolErrors. pdf.js fails with a generic error on some
 * encrypted files it can't decode, so a file that declares encryption is
 * reported as password-protected, as pdf-lib does in the other tools. The
 * file is read again: pdf.js has taken the first copy's buffer.
 */
async function openError(file: File, error: unknown): Promise<ToolError> {
  if (isToolError(error)) return error;
  const kind = error instanceof Error ? error.name : "";
  if (kind === "PasswordException") return toolErrors.encrypted(file.name);
  const bytes = new Uint8Array(await readAsArrayBuffer(file).catch(() => new ArrayBuffer(0)));
  if (declaresEncryption(bytes)) return toolErrors.encrypted(file.name);
  return toolErrors.corrupt(file.name, error);
}

export default function PdfToJpgUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const [source, setSource] = useState<Source | null>(null);
  const [range, setRange] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [convertError, setConvertError] = useState<ToolError | null>(null);
  const [progress, setProgress] = useState<{ value: number; label?: string }>({ value: 0 });
  const [alert, setAlert] = useState("");

  const renderer = useRef<PdfRenderer | null>(null);
  const cancelled = useRef(false);
  const current = useRef<File | null>(null);
  const thumbnail = useRef<string | undefined>(undefined);
  const dropZone = useRef<DropZoneHandle>(null);
  const focusDropZone = useRef(false);
  const hintId = useId();

  useEffect(
    () => () => {
      void renderer.current?.destroy();
      if (thumbnail.current) URL.revokeObjectURL(thumbnail.current);
    },
    [],
  );

  useEffect(() => {
    if (focusDropZone.current) {
      focusDropZone.current = false;
      dropZone.current?.focus();
    }
  });

  const pageCount = source?.status === "ready" ? (source.pageCount ?? 0) : 0;
  const selection = useMemo((): { pages: number[] } | { error: string } | null => {
    if (pageCount === 0) return null;
    if (options.pages === "all")
      return { pages: Array.from({ length: pageCount }, (_, i) => i + 1) };
    if (range.trim() === "") return null;
    const parsed = parsePageRange(range, pageCount);
    return parsed.ok ? { pages: parsed.pages } : { error: parsed.message };
  }, [pageCount, options.pages, range]);
  const pages = selection && "pages" in selection ? selection.pages : null;
  const rangeError = selection && "error" in selection ? selection.error : null;

  function invalidateResult() {
    setResult(null);
    setConvertError(null);
    setPhase((value) => (value === "done" ? "idle" : value));
  }

  function release() {
    void renderer.current?.destroy();
    renderer.current = null;
    if (thumbnail.current) URL.revokeObjectURL(thumbnail.current);
    thumbnail.current = undefined;
  }

  async function addFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    cancelled.current = true;
    release();
    current.current = file;
    invalidateResult();
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
      const bytes = new Uint8Array(await readAsArrayBuffer(file));
      // pdf.js loads now that the file is known to be a PDF; it checks the file too.
      const { openPdfRenderer } = await import("@/lib/pdf/render");
      const opened = await openPdfRenderer(bytes).catch(async (error: unknown) => {
        throw await openError(file, error);
      });
      if (current.current !== file) {
        void opened.destroy();
        return;
      }
      renderer.current = opened;
      setSource({ file, status: "ready", pageCount: opened.pageCount });
      const png = await opened.renderPage(0, THUMBNAIL_SCALE, "image/png").catch(() => null);
      if (!png || current.current !== file) return;
      thumbnail.current = URL.createObjectURL(png);
      setSource((value) =>
        value?.file === file ? { ...value, thumbnail: thumbnail.current } : value,
      );
    } catch (error) {
      if (current.current !== file) return;
      const toolError = toToolError(error, "checking the file");
      setSource({ file, status: "error", error: toolError.message });
      setAlert(toolError.message);
    }
  }

  function startOver() {
    cancelled.current = true;
    release();
    current.current = null;
    setSource(null);
    setRange("");
    setResult(null);
    setConvertError(null);
    setPhase("idle");
    focusDropZone.current = true;
  }

  const canConvert = Boolean(pages && pages.length > 0) && phase !== "converting";

  async function convert() {
    const pdf = renderer.current;
    if (!canConvert || !source || !pdf || !pages) return;
    cancelled.current = false;
    setConvertError(null);
    setPhase("converting");
    const format = options.format as ImageFormat;
    const type = format === "jpg" ? "image/jpeg" : "image/png";
    const maxPixels = MAX_PIXELS[getDeviceClass()];
    const images: OutputImage[] = [];
    try {
      // One page at a time: memory stays flat and Cancel stops between pages.
      for (const [index, page] of pages.entries()) {
        if (cancelled.current) throw toolErrors.cancelled();
        setProgress({
          value: index / pages.length,
          label: `Page ${page} (${index + 1} of ${pages.length})`,
        });
        const [width, height] = await pdf.pageSize(page - 1);
        const size = renderSize(width, height, Number(options.dpi) as Dpi, maxPixels);
        const blob = await pdf.renderPage(page - 1, size.scale, type, JPEG_QUALITY);
        images.push({ name: imageName(source.file.name, page, format), blob, ...size });
      }
      let zip: Blob | null = null;
      if (images.length > 1) {
        setProgress({ value: 1, label: "Creating the ZIP file" });
        const { createZip } = await import("@/lib/files/zip");
        const data = await createZip(
          await Promise.all(
            images.map(async (image) => ({
              name: image.name,
              data: new Uint8Array(await image.blob.arrayBuffer()),
              compressed: true,
            })),
          ),
        );
        zip = new Blob([data as BlobPart], { type: "application/zip" });
      }
      if (cancelled.current) throw toolErrors.cancelled();
      setResult({ images, zip, zipName: zipName(source.file.name) });
      setPhase("done");
    } catch (error) {
      const toolError = toToolError(error, "converting the PDF");
      setPhase("idle");
      if (toolError.code === "E_CANCELLED") return;
      setConvertError(toolError);
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
        <p role="alert" className="sr-only">
          {alert}
        </p>
      </div>
    );
  }

  const item: FileListItem = {
    id: "source",
    name: source.file.name,
    size: source.file.size,
    type: "PDF",
    meta: source.pageCount !== undefined ? plural(source.pageCount, "page") : undefined,
    thumbnail: source.thumbnail,
    busy: source.status === "checking",
    status: source.error
      ? { tone: "error", message: source.error }
      : source.warning
        ? { tone: "warning", message: source.warning }
        : undefined,
  };
  const busy = phase === "converting";
  const setOption = (patch: Partial<Options>) => {
    setOptions(patch);
    invalidateResult();
  };

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
          items={[item]}
          label="PDF to convert"
          onRemove={startOver}
          onEmptied={() => (focusDropZone.current = true)}
        />

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <span aria-hidden className="text-ui text-fg">
              Format
            </span>
            <SegmentedControl
              label="Format"
              options={FORMATS}
              value={options.format}
              onValueChange={(format) => setOption({ format: format as Options["format"] })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span aria-hidden className="text-ui text-fg">
              Resolution
            </span>
            <SegmentedControl
              label="Resolution"
              options={DPIS}
              value={options.dpi}
              onValueChange={(dpi) => setOption({ dpi: dpi as Options["dpi"] })}
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-3" disabled={busy}>
          <legend className="mb-3 text-ui text-fg">Pages</legend>
          <RadioGroup
            value={options.pages}
            onValueChange={(value) => setOption({ pages: value as Options["pages"] })}
            aria-label="Pages"
          >
            <Radio value="all" label="All pages" />
            <Radio value="range" label="Some pages" />
          </RadioGroup>
        </fieldset>
        {options.pages === "range" && (
          <Field
            label="Page range"
            description="For example 1-3, 5, 8- (8- means page 8 to the end)."
            error={rangeError ?? undefined}
          >
            <Input
              value={range}
              onChange={(event) => {
                setRange(event.target.value);
                invalidateResult();
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder={pageCount > 1 ? `1-${Math.min(3, pageCount)}` : "1"}
              disabled={busy || source.status !== "ready"}
              className="font-mono"
            />
          </Field>
        )}
        {/* Announces range errors as they appear (§2.4); the Field shows them. */}
        <span aria-live="assertive" className="sr-only">
          {rangeError ?? ""}
        </span>
      </div>

      <aside
        aria-label="Conversion result"
        className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-6"
      >
        <dl className="grid grid-cols-3 gap-3 rounded-md border border-border bg-surface-2 p-3">
          {[
            { term: "Pages", value: pageCount ? pageCount.toLocaleString("en-US") : "–" },
            { term: "Images", value: pages ? pages.length.toLocaleString("en-US") : "–" },
            { term: "Format", value: `${options.format.toUpperCase()} ${options.dpi}` },
          ].map(({ term, value }) => (
            <div key={term} className="flex flex-col gap-0.5">
              <dt className="text-micro text-fg-muted uppercase">{term}</dt>
              <dd className="font-mono text-ui text-fg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {busy && (
          <ProcessingState
            label="Converting pages"
            value={progress.value}
            detail={progress.label}
            onCancel={() => (cancelled.current = true)}
            focusCancel
          />
        )}

        {phase === "done" && result && <ConversionResult result={result} onStartOver={startOver} />}

        {phase === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              aria-disabled={!canConvert || undefined}
              aria-describedby={hintId}
              onClick={convert}
            >
              {pages && pages.length > 1
                ? `Convert ${pages.length} pages to ${options.format.toUpperCase()}`
                : `Convert to ${options.format.toUpperCase()}`}
            </Button>
            <p id={hintId} className="text-small text-fg-muted">
              {source.status === "checking"
                ? "Checking the file…"
                : source.status === "error"
                  ? "Choose another PDF."
                  : options.pages === "range" && range.trim() === ""
                    ? "Enter the pages to convert."
                    : rangeError
                      ? "Fix the pages above."
                      : "Your file stays on this device."}
            </p>
          </div>
        )}

        {convertError && (
          <ErrorState
            title="The pages couldn’t be converted"
            description={convertError.message}
            action={
              convertError.details ? (
                <details className="text-small text-fg-muted">
                  <summary className="cursor-pointer">Details</summary>
                  <p className="mt-1 font-mono break-all">{convertError.details}</p>
                </details>
              ) : undefined
            }
          />
        )}
      </aside>

      <p role="alert" className="sr-only">
        {alert}
      </p>
    </div>
  );
}

function ConversionResult({ result, onStartOver }: { result: Result; onStartOver: () => void }) {
  const [only] = result.images;
  const reduced = result.images.filter((image) => image.downscaled);
  const total = result.images.reduce((sum, image) => sum + image.blob.size, 0);
  const note = reduced.length > 0 && (
    <p className="flex items-start gap-2 rounded-md border border-warning bg-warning-soft p-3 text-small text-fg">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
      <span>
        {plural(reduced.length, "page")} {reduced.length === 1 ? "was" : "were"} reduced to fit this
        device’s limit (for example {reduced[0]!.name} at {reduced[0]!.dpi} DPI). Use a computer for
        full resolution.
      </span>
    </p>
  );
  if (result.images.length === 1 && only) {
    return (
      <div className="flex flex-col gap-4">
        <ResultPanel
          title={`${only.name} is ready`}
          summary={[
            `${only.width} × ${only.height} px`,
            `${only.dpi} DPI`,
            formatBytes(only.blob.size),
          ]}
          primary={
            <Button variant="primary" onClick={() => downloadBlob(only.blob, only.name)}>
              <Download aria-hidden />
              Download image
            </Button>
          }
          secondary={
            <Button variant="secondary" onClick={onStartOver}>
              Start over
            </Button>
          }
        />
        {note}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ResultPanel
        title={`${plural(result.images.length, "image")} are ready`}
        summary={[
          `1 PDF → ${plural(result.images.length, "image")}`,
          formatBytes(result.zip?.size ?? total),
        ]}
        primary={
          result.zip && (
            <Button variant="primary" onClick={() => downloadBlob(result.zip!, result.zipName)}>
              <FileArchive aria-hidden />
              Download all (ZIP)
            </Button>
          )
        }
        secondary={
          <Button variant="secondary" onClick={onStartOver}>
            Start over
          </Button>
        }
      />
      {note}
      <ul
        aria-label="Converted images"
        className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border"
      >
        {result.images.slice(0, LIST_LIMIT).map((image) => (
          <li key={image.name} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="min-w-0 truncate text-small text-fg">{image.name}</span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="text-small text-fg-muted tabular-nums">
                {image.width} × {image.height}
              </span>
              <IconButton
                label={`Download ${image.name}`}
                icon={<Download aria-hidden />}
                size="sm"
                onClick={() => downloadBlob(image.blob, image.name)}
              />
            </span>
          </li>
        ))}
      </ul>
      {result.images.length > LIST_LIMIT && (
        <p className="text-small text-fg-muted">
          The first {LIST_LIMIT} images are listed; all {result.images.length} are in the ZIP.
        </p>
      )}
    </div>
  );
}
