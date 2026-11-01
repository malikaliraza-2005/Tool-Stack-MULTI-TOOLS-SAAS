"use client";

import { useState } from "react";
import * as z from "zod/mini";
import { AvifNote, avifMegapixels } from "@/components/tool/AvifNote";
import { ImageWorkspace } from "@/components/tool/ImageWorkspace";
import { processImageEntry } from "@/components/tool/processImageEntry";
import { useImageBatch } from "@/components/tool/useImageBatch";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { OUTPUT_FORMATS } from "@/lib/image/formats";
import { Cropper } from "./Cropper";
// Small and dependency-free: imported directly (tool-registry §7.6).
import {
  ACCEPTED,
  ASPECTS,
  cropPixels,
  DEFAULT_QUALITY,
  defaultCrop,
  outputFormat,
  planResize,
  PRESETS,
  proportional,
  resizedName,
  resizeSettings,
  type Aspect,
  type Fit,
  type FormatChoice,
  type Mode,
  type NormalizedRect,
  type ResizeBy,
  type ResizeSettings,
} from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  mode: z.enum(["resize", "crop"]),
  by: z.enum(["pixels", "percent"]),
  width: z.number().check(z.int(), z.gte(0)),
  height: z.number().check(z.int(), z.gte(0)),
  keepProportions: z.boolean(),
  fit: z.enum(["inside", "fill"]),
  percent: z.number().check(z.int(), z.gte(1), z.lte(400)),
  dontEnlarge: z.boolean(),
  aspect: z.enum(["free", "1:1", "4:3", "16:9", "3:2", "9:16"]),
  format: z.enum(["same", "jpeg", "png", "webp", "avif"]),
  quality: z.number().check(z.int(), z.gte(0), z.lte(100)),
});
type Options = z.infer<typeof optionsSchema>;
const DEFAULTS: Options = {
  mode: "resize",
  by: "pixels",
  width: 1920,
  height: 0,
  keepProportions: true,
  fit: "inside",
  percent: 50,
  dontEnlarge: true,
  aspect: "free",
  format: "same",
  quality: DEFAULT_QUALITY,
};

const MODES = [
  { value: "resize", label: "Resize" },
  { value: "crop", label: "Crop" },
];
const BY = [
  { value: "pixels", label: "Pixels" },
  { value: "percent", label: "Percentage" },
];
const FITS = [
  { value: "inside", label: "Fit inside" },
  { value: "fill", label: "Fill and crop" },
];
const ASPECT_OPTIONS = ASPECTS.map((a) => ({ value: a, label: a === "free" ? "Free" : a }));
const FORMATS = [
  { value: "same", label: "Same as input" },
  { value: "jpeg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
];
const PRESET_OPTIONS = [
  { value: "custom", label: "Custom size" },
  ...PRESETS.map((p) => ({ value: p.id, label: p.label })),
];

const LIMITS_HINT = "JPG, PNG, WebP, AVIF · up to 100 MB per image, 50 images";

/** A number field: empty means "not set" (stored as 0). */
function parseSide(text: string): number {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30_000) : 0;
}

export default function ResizeImageUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const batch = useImageBatch({ meta, accepted: ACCEPTED });
  // Crop areas per image (relative 0–1), so each image can be framed on its own.
  const [crops, setCrops] = useState<Record<string, NormalizedRect>>({});

  const mode = options.mode as Mode;
  const aspect = options.aspect as Aspect;
  const settings: ResizeSettings = {
    by: options.by as ResizeBy,
    width: options.width || null,
    height: options.height || null,
    keepProportions: options.keepProportions,
    fit: options.fit as Fit,
    percent: options.percent,
    dontEnlarge: options.dontEnlarge,
  };
  const selected = batch.selected?.info ? batch.selected : batch.ready[0];
  const single = batch.ready.length === 1 ? batch.ready[0] : undefined;
  const lossy =
    batch.ready.length === 0 ||
    batch.ready.some(
      (e) => OUTPUT_FORMATS[outputFormat(e.info!.kind, options.format as FormatChoice)].lossy,
    );

  const cropFor = (id: string, size: { width: number; height: number }) =>
    crops[id] ?? defaultCrop(size, aspect);

  const setOption = (patch: Partial<Options>) => {
    setOptions(patch);
    batch.invalidate();
  };

  /** With one image and proportions kept, typing one side fills in the other. */
  function setSide(side: "width" | "height", text: string) {
    const value = parseSide(text);
    if (single?.info && options.keepProportions && value > 0) {
      const other = proportional(single.info, side, value);
      setOption({ width: other.width, height: other.height });
    } else {
      setOption({ [side]: value });
    }
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setOption({
      by: "pixels",
      width: preset.width ?? 0,
      height: preset.height ?? 0,
      keepProportions: true,
      fit: preset.width && preset.height ? "fill" : "inside",
    });
  }

  const preset =
    PRESETS.find(
      (p) =>
        options.by === "pixels" &&
        (p.width ?? 0) === options.width &&
        (p.height ?? 0) === options.height &&
        options.keepProportions,
    )?.id ?? "custom";

  function run() {
    void batch.run(
      async (entry, context) => {
        const info = entry.info!;
        const format = options.format as FormatChoice;
        const plan = mode === "resize" ? planResize(info, settings) : undefined;
        const processOptions =
          mode === "resize"
            ? resizeSettings(info, settings, format, options.quality)
            : {
                format: outputFormat(info.kind, format),
                quality: options.quality,
                crop: cropPixels(cropFor(entry.id, info), info),
              };
        const result = await processImageEntry(entry, context, processOptions, (details) =>
          resizedName(entry.file.name, mode, details.format),
        );
        const sizes = `${info.width} × ${info.height} → ${result.width} × ${result.height}`;
        return { ...result, note: plan?.limited ? `${sizes} (not enlarged)` : sizes };
      },
      { action: mode === "crop" ? "Cropping" : "Resizing" },
    );
  }

  const preview = selected?.info && mode === "resize" ? planResize(selected.info, settings) : null;
  const stage =
    mode === "crop" && selected?.info && selected.thumbnail && batch.phase !== "done" ? (
      <Cropper
        key={`${selected.id}-${aspect}`}
        src={selected.thumbnail}
        width={selected.info.width}
        height={selected.info.height}
        aspect={aspect}
        value={cropFor(selected.id, selected.info)}
        onChange={(rect) => {
          setCrops((current) => ({ ...current, [selected.id]: rect }));
          batch.invalidate();
        }}
      />
    ) : undefined;

  return (
    <ImageWorkspace
      batch={batch}
      meta={meta}
      hint={LIMITS_HINT}
      stage={stage}
      selectLabel={mode === "crop" ? "Crop" : undefined}
      actionLabel={(count) =>
        `${mode === "crop" ? "Crop" : "Resize"} ${count > 1 ? `${count} images` : "image"}`
      }
      busyLabel={mode === "crop" ? "Cropping images" : "Resizing images"}
      onRun={run}
      afterLabel={mode === "crop" ? "Cropped" : "Resized"}
      zipName={mode === "crop" ? "images-cropped.zip" : "images-resized.zip"}
      summary={[]}
      options={
        <>
          <div className="flex flex-col gap-1.5">
            <span aria-hidden className="text-ui text-fg">
              Mode
            </span>
            <SegmentedControl
              label="Mode"
              options={MODES}
              value={mode}
              onValueChange={(value) => {
                setOption({ mode: value as Mode });
                setCrops({});
              }}
              className="self-start"
            />
          </div>

          {mode === "resize" ? (
            <>
              <Field label="Preset">
                <Select options={PRESET_OPTIONS} value={preset} onValueChange={applyPreset} />
              </Field>
              <div className="flex flex-col gap-1.5">
                <span aria-hidden className="text-ui text-fg">
                  Resize by
                </span>
                <SegmentedControl
                  label="Resize by"
                  options={BY}
                  value={options.by}
                  onValueChange={(by) => setOption({ by: by as ResizeBy })}
                  className="self-start"
                />
              </div>
              {options.by === "pixels" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Width (px)">
                      <Input
                        inputMode="numeric"
                        value={options.width ? String(options.width) : ""}
                        placeholder="Auto"
                        onChange={(event) => setSide("width", event.target.value)}
                      />
                    </Field>
                    <Field label="Height (px)">
                      <Input
                        inputMode="numeric"
                        value={options.height ? String(options.height) : ""}
                        placeholder="Auto"
                        onChange={(event) => setSide("height", event.target.value)}
                      />
                    </Field>
                  </div>
                  <Checkbox
                    label="Keep proportions"
                    checked={options.keepProportions}
                    onCheckedChange={(checked) => setOption({ keepProportions: checked === true })}
                  />
                  {options.keepProportions && options.width > 0 && options.height > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span aria-hidden className="text-ui text-fg">
                        Fit
                      </span>
                      <SegmentedControl
                        label="Fit"
                        options={FITS}
                        value={options.fit}
                        onValueChange={(fit) => setOption({ fit: fit as Fit })}
                        className="self-start"
                      />
                    </div>
                  )}
                </>
              ) : (
                <Field label="Percentage">
                  <Input
                    inputMode="numeric"
                    value={String(options.percent)}
                    onChange={(event) =>
                      setOption({
                        percent: Math.min(400, Math.max(1, parseSide(event.target.value) || 1)),
                      })
                    }
                  />
                </Field>
              )}
              <Checkbox
                label="Don’t enlarge"
                checked={options.dontEnlarge}
                onCheckedChange={(checked) => setOption({ dontEnlarge: checked === true })}
              />
              {preview && selected?.info && (
                <p className="font-mono text-small text-fg-muted tabular-nums">
                  {selected.info.width} × {selected.info.height} → {preview.output.width} ×{" "}
                  {preview.output.height}
                  {preview.limited ? " (not enlarged)" : ""}
                </p>
              )}
            </>
          ) : (
            <Field label="Aspect ratio">
              <Select
                options={ASPECT_OPTIONS}
                value={aspect}
                onValueChange={(value) => {
                  setOption({ aspect: value as Aspect });
                  setCrops({});
                }}
              />
            </Field>
          )}

          <Field label="Format">
            <Select
              options={FORMATS}
              value={options.format}
              onValueChange={(format) => setOption({ format: format as FormatChoice })}
            />
          </Field>
          {batch.ready.some(
            (e) => outputFormat(e.info!.kind, options.format as FormatChoice) === "avif",
          ) && (
            <AvifNote
              megapixels={avifMegapixels(
                batch.ready
                  .filter(
                    (e) => outputFormat(e.info!.kind, options.format as FormatChoice) === "avif",
                  )
                  .map((e) => e.info!),
              )}
            />
          )}
          {lossy && (
            <Slider
              label="Quality"
              min={0}
              max={100}
              value={options.quality}
              onValueChange={(quality) => setOption({ quality })}
            />
          )}
        </>
      }
    />
  );
}
