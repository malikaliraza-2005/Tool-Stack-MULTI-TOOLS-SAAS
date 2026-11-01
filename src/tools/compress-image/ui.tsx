"use client";

import * as z from "zod/mini";
import { batchTotals, ImageWorkspace } from "@/components/tool/ImageWorkspace";
import { processImageEntry } from "@/components/tool/processImageEntry";
import { useImageBatch } from "@/components/tool/useImageBatch";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { formatBytes } from "@/lib/files/format";
// Small and dependency-free: imported directly (tool-registry §7.6).
import {
  ACCEPTED,
  compressedName,
  compressNote,
  compressSettings,
  DEFAULT_QUALITY,
  outputFormat,
  percentSaved,
  type CompressOptions,
  type FormatChoice,
} from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  format: z.enum(["same", "jpeg", "webp", "avif", "png"]),
  quality: z.number().check(z.int(), z.gte(0), z.lte(100)),
  maxDimension: z.number().check(z.int(), z.gte(0)),
  stripMetadata: z.boolean(),
});
const DEFAULTS: CompressOptions = {
  format: "same",
  quality: DEFAULT_QUALITY,
  maxDimension: 0,
  stripMetadata: true,
};

const FORMATS = [
  { value: "same", label: "Same as input" },
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF (smallest, slower)" },
  { value: "png", label: "PNG (lossless)" },
];
const SIZES = [
  { value: "0", label: "Keep the size" },
  { value: "3840", label: "3840 px (4K)" },
  { value: "2560", label: "2560 px" },
  { value: "1920", label: "1920 px (Full HD)" },
  { value: "1280", label: "1280 px" },
  { value: "1024", label: "1024 px" },
];

const LIMITS_HINT = "JPG, PNG, WebP, AVIF · up to 100 MB per image, 50 images";

export default function CompressImageUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const batch = useImageBatch({ meta, accepted: ACCEPTED });

  const kinds = batch.ready.map((e) => e.info!.kind);
  const outputs = kinds.map((kind) => outputFormat(kind, options.format as FormatChoice));
  // Quality applies when any output is lossy (all formats but PNG).
  const showQuality =
    options.format !== "png" && (outputs.length === 0 || outputs.some((f) => f !== "png"));
  const metadataNote =
    !options.stripMetadata && outputs.some((f, i) => !(kinds[i] === "jpeg" && f === "jpeg"))
      ? "Metadata can only be kept when a JPG stays a JPG; other images are saved without it."
      : "Removes location, camera and date details from the compressed images.";

  const setOption = (patch: Partial<CompressOptions>) => {
    setOptions(patch);
    batch.invalidate();
  };

  function run() {
    void batch.run(
      async (entry, context) => {
        const result = await processImageEntry(
          entry,
          context,
          compressSettings(entry.info!, options),
          (details) => compressedName(entry.file.name, details.format),
        );
        return {
          ...result,
          note: compressNote(entry.file.size, result.blob.size, result.details.keptOriginal),
        };
      },
      { action: "Compressing" },
    );
  }

  const totals = batchTotals(batch);
  return (
    <ImageWorkspace
      batch={batch}
      meta={meta}
      hint={LIMITS_HINT}
      actionLabel={(count) => (count > 1 ? `Compress ${count} images` : "Compress image")}
      busyLabel="Compressing images"
      onRun={run}
      afterLabel="Compressed"
      zipName="images-compressed.zip"
      summary={[
        `${formatBytes(totals.before)} → ${formatBytes(totals.after)}`,
        `saved ${Math.max(0, percentSaved(totals.before, totals.after))}%`,
      ]}
      options={
        <>
          <Field label="Format">
            <Select
              options={FORMATS}
              value={options.format}
              onValueChange={(format) => setOption({ format: format as FormatChoice })}
            />
          </Field>
          {showQuality && (
            <Slider
              label="Quality"
              min={0}
              max={100}
              value={options.quality}
              onValueChange={(quality) => setOption({ quality })}
            />
          )}
          {showQuality && (
            <p className="-mt-3 text-small text-fg-muted">
              75 is a good balance. Lower is smaller with more visible artifacts.
            </p>
          )}
          <Field label="Longest side">
            <Select
              options={SIZES}
              value={String(options.maxDimension)}
              onValueChange={(value) => setOption({ maxDimension: Number(value) })}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Switch
              label="Remove metadata"
              checked={options.stripMetadata}
              onCheckedChange={(stripMetadata) => setOption({ stripMetadata })}
            />
            <p className="text-small text-fg-muted">{metadataNote}</p>
          </div>
        </>
      }
    />
  );
}
