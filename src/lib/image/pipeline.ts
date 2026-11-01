// The shared image pipeline (P6-T01): decode → orient → crop → resize →
// flatten → encode. Codecs are passed in (`Codecs`), so the steps are tested
// in Node with the same WASM codecs the worker uses.

import { isOutOfMemory, toolErrors, ToolError } from "@/lib/errors";
import { formatBytes } from "@/lib/files/format";
import { describeKind, detectFileType } from "@/lib/files/sniff";
import {
  KIND_LABELS,
  readImageInfo,
  sameFormat,
  type ImageInfo,
  type ImageKind,
  type OutputFormat,
} from "./formats";
import { copyJpegMetadata, stripMetadata } from "./metadata";
import { crop, flatten, hasTransparency, orient, type Pixels, type Rect, type Rgb } from "./pixels";

export type Codecs = {
  /**
   * Decodes to RGBA. `oriented` says whether EXIF orientation was already
   * applied (browser decoders do it; WASM decoders don't).
   */
  decode(bytes: ArrayBuffer, kind: ImageKind): Promise<{ pixels: Pixels; oriented: boolean }>;
  encode(
    pixels: Pixels,
    format: OutputFormat,
    quality: number,
    options?: { avifSpeed?: number },
  ): Promise<ArrayBuffer>;
  /** High-quality resampling (Lanczos) to exactly `width` × `height`. */
  resize(pixels: Pixels, width: number, height: number): Promise<Pixels>;
};

export type ProcessOptions = {
  format: OutputFormat;
  /** Use this format instead when the image has transparent pixels (convert-image's Auto). */
  alphaFormat?: OutputFormat;
  /** 0–100, for lossy formats. */
  quality: number;
  /** In upright source pixels. */
  crop?: Rect;
  /** Final size, after cropping. */
  resize?: { width: number; height: number };
  /** Background for transparent pixels when the output format has no alpha. Default white. */
  background?: Rgb;
  /** Compress: return the original when the result isn't smaller (and nothing was resized). */
  keepOriginalIfLarger?: boolean;
  /** Keep EXIF/XMP/IPTC (JPG → JPG only); otherwise the output has no metadata. */
  keepMetadata?: boolean;
  /** AVIF encoder effort, 0 (slowest, smallest) to 10; phones use a faster setting (P6-T10). */
  avifSpeed?: number;
};

export type ProcessResult = {
  bytes: ArrayBuffer;
  format: OutputFormat;
  width: number;
  height: number;
  /** The original was returned (without metadata unless `keepMetadata`): it was already smaller. */
  keptOriginal: boolean;
  /** Transparent pixels were composited onto the background. */
  flattened: boolean;
};

export type ImageLimits = { maxPixels: number };

const WHITE: Rgb = [255, 255, 255];

/** Header facts, or E_UNSUPPORTED_FORMAT (other types) / E_CORRUPT (damaged header). */
export function inspectImage(
  name: string,
  bytes: Uint8Array,
  accepted: readonly ImageKind[],
  tool: string,
): ImageInfo {
  const kind = detectFileType(bytes.subarray(0, 1024));
  if (!kind || kind === "pdf" || !accepted.includes(kind)) {
    throw toolErrors.unsupportedFormat({
      name,
      detected: kind ? describeKind(kind) : undefined,
      tool,
      formats: listKinds(accepted),
    });
  }
  const info = readImageInfo(bytes);
  if (!info) throw toolErrors.corrupt(name);
  return info;
}

/** "JPG, PNG and WebP images". */
export function listKinds(kinds: readonly ImageKind[]): string {
  const labels = kinds.map((kind) => KIND_LABELS[kind]);
  const last = labels.pop();
  return `${labels.length > 0 ? `${labels.join(", ")} and ${last}` : last} images`;
}

/** E_TOO_LARGE when decoding would need more memory than this device should give. */
export function checkPixels(name: string, info: ImageInfo, limits: ImageLimits): void {
  const pixels = info.width * info.height;
  if (pixels <= limits.maxPixels) return;
  const mp = (n: number) => `${Math.round(n / 1e6)} megapixels`;
  throw new ToolError(
    "E_TOO_LARGE",
    `${name} is ${info.width} × ${info.height} (${mp(pixels)}). The limit on this device is ${mp(limits.maxPixels)}. Try a smaller image, or a desktop browser.`,
    { fileName: name },
  );
}

/** HEIC that neither the browser nor libheif could decode (tool-specifications §4.2, D-6). */
export function heicCouldNotOpen(name: string, cause?: unknown): ToolError {
  return new ToolError(
    "E_CORRUPT",
    `${name} is a HEIC photo that couldn’t be opened. It may be damaged, or the decoder didn’t load. Try again, or save it as JPG first (on iPhone: Settings › Camera › Formats › Most Compatible).`,
    { fileName: name, cause },
  );
}

/** Decodes and turns upright: the starting point of every operation. */
export async function decodeUpright(
  name: string,
  bytes: ArrayBuffer,
  info: ImageInfo,
  codecs: Codecs,
): Promise<Pixels> {
  let decoded: Awaited<ReturnType<Codecs["decode"]>>;
  try {
    decoded = await codecs.decode(bytes, info.kind);
  } catch (error) {
    if (error instanceof ToolError) throw error;
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    if (info.kind === "heic") throw heicCouldNotOpen(name, error);
    throw toolErrors.corrupt(name, error);
  }
  return decoded.oriented ? decoded.pixels : orient(decoded.pixels, info.orientation);
}

export type ProcessHooks = {
  /** What is happening now, for progress labels. */
  onStep?: (label: string) => void;
  /** The decoded, upright source pixels (for previews). */
  onSource?: (pixels: Pixels) => void;
};

/** Runs the pipeline on one image. */
export async function processImage(
  input: { name: string; bytes: ArrayBuffer },
  info: ImageInfo,
  options: ProcessOptions,
  codecs: Codecs,
  hooks: ProcessHooks = {},
): Promise<ProcessResult> {
  const { name } = input;
  try {
    hooks.onStep?.(`Decoding ${name}`);
    let pixels = await decodeUpright(name, input.bytes, info, codecs);
    hooks.onSource?.(pixels);
    let changedSize = false;
    if (options.crop) {
      const cropped = crop(pixels, options.crop);
      changedSize ||= cropped !== pixels;
      pixels = cropped;
    }
    const target = options.resize;
    if (target && (target.width !== pixels.width || target.height !== pixels.height)) {
      hooks.onStep?.(`Resizing ${name}`);
      pixels = await codecs.resize(
        pixels,
        Math.max(1, Math.round(target.width)),
        Math.max(1, Math.round(target.height)),
      );
      changedSize = true;
    }
    const transparent = hasTransparency(pixels);
    const format = options.alphaFormat && transparent ? options.alphaFormat : options.format;
    let flattened = false;
    if (!formatHasAlpha(format) && transparent) {
      pixels = flatten(pixels, options.background ?? WHITE);
      flattened = true;
    }
    hooks.onStep?.(`Encoding ${name}`);
    let bytes = await codecs.encode(pixels, format, options.quality, {
      avifSpeed: options.avifSpeed,
    });
    if (options.keepMetadata && format === "jpeg" && info.kind === "jpeg") {
      bytes = toArrayBuffer(copyJpegMetadata(new Uint8Array(input.bytes), new Uint8Array(bytes)));
    }

    const original = sameFormat(info.kind);
    if (
      options.keepOriginalIfLarger &&
      !changedSize &&
      original &&
      bytes.byteLength >= input.bytes.byteLength
    ) {
      const kept = keepOriginal(input.bytes, original, options.keepMetadata ?? false);
      return {
        bytes: kept,
        format: original,
        width: info.width,
        height: info.height,
        keptOriginal: true,
        flattened: false,
      };
    }
    return {
      bytes,
      format,
      width: pixels.width,
      height: pixels.height,
      keptOriginal: false,
      flattened,
    };
  } catch (error) {
    if (error instanceof ToolError) throw error;
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw toolErrors.unknown(
      `processing ${name}`,
      error instanceof Error ? error.message : String(error),
      error,
    );
  }
}

function formatHasAlpha(format: OutputFormat): boolean {
  return format !== "jpeg";
}

/** The original file, with its metadata removed losslessly where the format allows. */
function keepOriginal(
  bytes: ArrayBuffer,
  format: OutputFormat,
  keepMetadata: boolean,
): ArrayBuffer {
  if (keepMetadata || format === "avif") return bytes;
  try {
    // Pixels are already upright in every output, so the original keeps its orientation tag.
    return toArrayBuffer(stripMetadata(new Uint8Array(bytes), format, { keepOrientation: true }));
  } catch {
    return bytes;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength &&
    bytes.buffer instanceof ArrayBuffer
  ) {
    return bytes.buffer;
  }
  return bytes.slice().buffer as ArrayBuffer;
}

/** "Saved 62% (1.2 MB → 450 KB)" style numbers for summaries. */
export function savings(before: number, after: number): { percent: number; label: string } {
  const percent = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  return { percent, label: `${formatBytes(before)} → ${formatBytes(after)}` };
}
