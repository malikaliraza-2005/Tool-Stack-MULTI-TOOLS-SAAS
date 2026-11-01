// Codecs for the image pipeline (P6-T01), used inside the image worker. Each
// WASM codec is imported on first use, so only the formats a job needs load.
//
// Decoding: the browser decoder first for photos (fast, colour-managed, EXIF
// orientation applied), the WASM decoder when it fails (very large images,
// formats the browser lacks). PNG goes the other way: the WASM decoder keeps
// exact pixel values, which lossless output must preserve.

import { ToolError } from "@/lib/errors";
import { KIND_MIME, type ImageKind, type OutputFormat } from "./formats";
import type { Codecs } from "./pipeline";
import type { Pixels } from "./pixels";

/** AVIF encoder effort, 0 (slowest, smallest) to 10. 6 is the libavif default. */
export const AVIF_SPEED = 6;

function toImageData(pixels: Pixels): ImageData {
  if (typeof ImageData === "undefined" || pixels instanceof ImageData) return pixels as ImageData;
  return new ImageData(pixels.data, pixels.width, pixels.height);
}

async function decodeNative(bytes: ArrayBuffer, kind: ImageKind): Promise<Pixels> {
  if (typeof createImageBitmap === "undefined" || typeof OffscreenCanvas === "undefined") {
    throw new Error("No browser decoder here");
  }
  const bitmap = await createImageBitmap(new Blob([bytes], { type: KIND_MIME[kind] }));
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No 2D canvas in this worker");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function decodeWasm(bytes: ArrayBuffer, kind: ImageKind): Promise<Pixels | null> {
  switch (kind) {
    case "jpeg":
      return (await import("@jsquash/jpeg/decode")).default(bytes);
    case "png":
      return (await import("@jsquash/png/decode")).default(bytes);
    case "webp":
      return (await import("@jsquash/webp/decode")).default(bytes);
    case "avif":
      return (await import("@jsquash/avif/decode")).default(bytes);
    default:
      return null;
  }
}

export function heicUnsupported(name?: string): ToolError {
  return new ToolError(
    "E_UNSUPPORTED_FORMAT",
    `${name ?? "This file"} is a HEIC photo, which this browser can’t open yet. Use Safari, or save the photo as JPG first (on iPhone: Settings › Camera › Formats › Most Compatible).`,
    { fileName: name },
  );
}

const decode: Codecs["decode"] = async (bytes, kind) => {
  if (kind === "png") {
    const pixels = await decodeWasm(bytes, kind).catch(() => null);
    if (pixels) return { pixels, oriented: false };
  }
  let nativeError: unknown;
  try {
    return { pixels: await decodeNative(bytes, kind), oriented: true };
  } catch (error) {
    nativeError = error;
  }
  if (kind === "heic") throw heicUnsupported();
  const pixels = kind === "png" ? null : await decodeWasm(bytes, kind);
  if (!pixels) throw nativeError;
  return { pixels, oriented: false };
};

const encode: Codecs["encode"] = async (pixels, format: OutputFormat, quality) => {
  const image = toImageData(pixels);
  switch (format) {
    case "jpeg":
      return (await import("@jsquash/jpeg/encode")).default(image, { quality });
    case "webp":
      return (await import("@jsquash/webp/encode")).default(image, { quality });
    case "avif":
      return (await import("@jsquash/avif/encode")).default(image, { quality, speed: AVIF_SPEED });
    case "png":
      // Lossless: oxipng picks the smallest PNG encoding of exactly these pixels.
      // optimiseAlpha off, so fully transparent pixels keep their colour values too.
      return (await import("@jsquash/oxipng/optimise")).default(image, {
        level: 2,
        interlace: false,
        optimiseAlpha: false,
      });
  }
};

const resize: Codecs["resize"] = async (pixels, width, height) => {
  const { default: resizeImage } = await import("@jsquash/resize");
  return resizeImage(toImageData(pixels), {
    width,
    height,
    method: "lanczos3",
    fitMethod: "stretch",
    premultiply: true,
    linearRGB: true,
  });
};

export const codecs: Codecs = { decode, encode, resize };
