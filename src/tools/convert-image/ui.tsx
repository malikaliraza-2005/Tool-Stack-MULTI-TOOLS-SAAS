"use client";

import * as z from "zod/mini";
import { AvifNote, avifMegapixels } from "@/components/tool/AvifNote";
import { ImageWorkspace } from "@/components/tool/ImageWorkspace";
import { processImageEntry } from "@/components/tool/processImageEntry";
import { useImageBatch } from "@/components/tool/useImageBatch";
import { useToolOptions } from "@/components/tool/useToolOptions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
// Small and dependency-free: imported directly (tool-registry §7.6).
import {
  ACCEPTED,
  animationWarning,
  backgroundApplies,
  convertedName,
  convertNote,
  convertSettings,
  DEFAULT_BACKGROUND,
  DEFAULT_QUALITY,
  type ConvertOptions,
  type FormatChoice,
} from "./logic";
import { meta } from "./meta";

const optionsSchema = z.object({
  format: z.enum(["auto", "jpeg", "png", "webp", "avif"]),
  quality: z.number().check(z.int(), z.gte(0), z.lte(100)),
  background: z.string().check(z.regex(/^#[0-9a-f]{6}$/i)),
});
const DEFAULTS: ConvertOptions = {
  format: "auto",
  quality: DEFAULT_QUALITY,
  background: DEFAULT_BACKGROUND,
};

const FORMATS = [
  { value: "auto", label: "Auto (JPG, or PNG if transparent)" },
  { value: "jpeg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF (smallest, slower)" },
];
const BACKGROUNDS = [
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "custom", label: "Custom colour" },
];

const LIMITS_HINT = "JPG, PNG, WebP, AVIF, GIF, BMP, HEIC · up to 100 MB per image, 50 images";

export default function ConvertImageUI() {
  const [options, setOptions] = useToolOptions(meta.slug, optionsSchema, DEFAULTS);
  const batch = useImageBatch({ meta, accepted: ACCEPTED, warn: animationWarning });

  const format = options.format as FormatChoice;
  const infos = batch.ready.map((e) => e.info!);
  const showQuality = format !== "png";
  const showBackground = backgroundApplies(infos, format);
  const preset = BACKGROUNDS.some((b) => b.value === options.background.toLowerCase())
    ? options.background.toLowerCase()
    : "custom";

  const setOption = (patch: Partial<ConvertOptions>) => {
    setOptions(patch);
    batch.invalidate();
  };

  function run() {
    void batch.run(
      async (entry, context) => {
        const result = await processImageEntry(entry, context, convertSettings(options), (d) =>
          convertedName(entry.file.name, entry.info!.kind, d.format),
        );
        return {
          ...result,
          note: convertNote(entry.info!.kind, result.details.format, result.details.flattened),
        };
      },
      { action: "Converting" },
    );
  }

  return (
    <ImageWorkspace
      batch={batch}
      meta={meta}
      hint={LIMITS_HINT}
      actionLabel={(count) => (count > 1 ? `Convert ${count} images` : "Convert image")}
      busyLabel="Converting images"
      onRun={run}
      afterLabel="Converted"
      zipName="images-converted.zip"
      summary={[]}
      options={
        <>
          <Field label="Convert to">
            <Select
              options={FORMATS}
              value={format}
              onValueChange={(value) => setOption({ format: value as FormatChoice })}
            />
          </Field>
          {format === "avif" && <AvifNote megapixels={avifMegapixels(infos)} />}
          {showQuality && (
            <Slider
              label="Quality"
              min={0}
              max={100}
              value={options.quality}
              onValueChange={(quality) => setOption({ quality })}
            />
          )}
          {showBackground && (
            <>
              <Field
                label="Background for transparent areas"
                description="JPG has no transparency, so transparent areas are filled with this colour."
              >
                <Select
                  options={BACKGROUNDS}
                  value={preset}
                  onValueChange={(value) =>
                    setOption({ background: value === "custom" ? "#808080" : value })
                  }
                />
              </Field>
              {preset === "custom" && (
                <Field label="Custom colour">
                  <Input
                    type="color"
                    value={options.background}
                    onChange={(event) => setOption({ background: event.target.value })}
                    className="h-10 w-20 p-1"
                  />
                </Field>
              )}
            </>
          )}
        </>
      }
    />
  );
}
