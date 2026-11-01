// Browser helpers for Sign PDF (tool-specifications §3.6): signature images,
// text measurement and the opt-in saved signature. Runs on the page (canvas).

import { toolErrors } from "@/lib/errors";
import { storageKey } from "@/lib/storage";

export type InkColor = "black" | "blue";
/** Ink colours of signatures: content drawn into the PDF, not UI styling. */
export const INK: Record<InkColor, string> = { black: "#111111", blue: "#1b3c99" };

/** A signature ready to place: a trimmed PNG and its size in pixels. */
export type SignatureImage = { blob: Blob; url: string; width: number; height: number };

/** Text in placed items uses Helvetica in the PDF; Arial has the same metrics. */
export const TEXT_FONT = "Helvetica, Arial, sans-serif";

const PADDING = 6;
/** Longest side of a stored or uploaded signature, in pixels. */
const MAX_SIDE = 1200;

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = Math.max(1, Math.ceil(width));
  element.height = Math.max(1, Math.ceil(height));
  const context = element.getContext("2d");
  if (!context) throw toolErrors.outOfMemory();
  return { element, context };
}

/** The canvas cropped to its visible pixels plus padding; null when it is empty. */
export function trimCanvas(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const context = source.getContext("2d");
  if (!context) return null;
  const { width, height } = source;
  const { data } = context.getImageData(0, 0, width, height);
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        bottom = y;
      }
    }
  }
  if (right < 0) return null;
  left = Math.max(0, left - PADDING);
  top = Math.max(0, top - PADDING);
  right = Math.min(width - 1, right + PADDING);
  bottom = Math.min(height - 1, bottom + PADDING);
  const out = canvas(right - left + 1, bottom - top + 1);
  out.context.drawImage(
    source,
    left,
    top,
    out.element.width,
    out.element.height,
    0,
    0,
    out.element.width,
    out.element.height,
  );
  return out.element;
}

export async function toSignature(source: HTMLCanvasElement): Promise<SignatureImage> {
  const blob = await new Promise<Blob | null>((resolve) => source.toBlob(resolve, "image/png"));
  if (!blob) throw toolErrors.outOfMemory();
  return { blob, url: URL.createObjectURL(blob), width: source.width, height: source.height };
}

/** A typed signature: `name` in a handwriting font, trimmed. */
export async function typedSignature(
  name: string,
  fontFamily: string,
  color: string,
): Promise<SignatureImage | null> {
  const size = 96;
  const font = `${size}px ${fontFamily}`;
  // The font is only fetched when used; wait so the canvas doesn't fall back.
  await document.fonts.load(font, name);
  const probe = canvas(1, 1).context;
  probe.font = font;
  const width = probe.measureText(name).width + size;
  const { element, context } = canvas(width, size * 1.8);
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(name, size / 2, element.height / 2);
  const trimmed = trimCanvas(element);
  return trimmed ? toSignature(trimmed) : null;
}

/**
 * An uploaded signature image, upright and at most MAX_SIDE pixels. With
 * `clearWhite`, near-white pixels become transparent, so a photo of a
 * signature on paper doesn't cover the page.
 */
export async function uploadedSignature(
  file: Blob,
  clearWhite: boolean,
): Promise<SignatureImage | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const { element, context } = canvas(bitmap.width * scale, bitmap.height * scale);
  context.drawImage(bitmap, 0, 0, element.width, element.height);
  bitmap.close();
  if (clearWhite) {
    const image = context.getImageData(0, 0, element.width, element.height);
    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      const light = Math.min(data[i]!, data[i + 1]!, data[i + 2]!);
      // Fully clear above 225, fade in below it for soft edges.
      if (light > 165) data[i + 3] = Math.round(data[i + 3]! * Math.max(0, (225 - light) / 60));
    }
    context.putImageData(image, 0, 0);
  }
  const trimmed = trimCanvas(element);
  return trimmed ? toSignature(trimmed) : null;
}

/** Width of `text` at `size` in the placed-text font, in the same unit as `size`. */
export function measureText(text: string, size: number): number {
  const { context } = canvas(1, 1);
  context.font = `${size}px ${TEXT_FONT}`;
  return context.measureText(text).width;
}

/**
 * Text the PDF's standard font can't encode (e.g. Greek, Cyrillic, CJK),
 * drawn as a PNG at 4× its size in points, black on transparent.
 */
export async function textImage(text: string, size: number): Promise<Blob> {
  const scale = 4;
  const { element, context } = canvas(measureText(text, size) * scale + 2, size * 1.25 * scale);
  context.font = `${size * scale}px ${TEXT_FONT}`;
  context.fillStyle = INK.black;
  context.textBaseline = "alphabetic";
  context.fillText(text, 1, element.height - 0.28 * size * scale);
  const blob = await new Promise<Blob | null>((resolve) => element.toBlob(resolve, "image/png"));
  if (!blob) throw toolErrors.outOfMemory();
  return blob;
}

// Saved signature: stored only after the user opts in (spec §3.6), as a PNG
// data URL in localStorage. It is the one piece of user content Sprigkit
// stores, so it bypasses the options-only storage helper on purpose.

const SAVED_KEY = storageKey("sign-pdf:signature");
const SAVED_PREFIX = "data:image/png;base64,";
/** Largest data URL kept (localStorage holds about 5 MB per site). */
const SAVED_MAX_CHARS = 400_000;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedSignature(): string | null {
  try {
    const value = storage()?.getItem(SAVED_KEY) ?? null;
    return value?.startsWith(SAVED_PREFIX) && value.length <= SAVED_MAX_CHARS ? value : null;
  } catch {
    return null;
  }
}

/** Stores the signature; false when it is too large or storage is unavailable. */
export async function saveSignature(blob: Blob): Promise<boolean> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  }).catch(() => "");
  if (!url.startsWith(SAVED_PREFIX) || url.length > SAVED_MAX_CHARS) return false;
  try {
    storage()?.setItem(SAVED_KEY, url);
    return storage()?.getItem(SAVED_KEY) === url;
  } catch {
    return false;
  }
}

export function deleteSavedSignature(): void {
  try {
    storage()?.removeItem(SAVED_KEY);
  } catch {
    // Storage unavailable: nothing is stored.
  }
}

/** The saved signature as a placeable image. */
export async function savedSignatureImage(url: string): Promise<SignatureImage> {
  // Decoded here, not fetched: the CSP's connect-src doesn't allow data: URLs.
  const binary = atob(url.slice(SAVED_PREFIX.length));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: "image/png" });
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return { blob, url: URL.createObjectURL(blob), ...size };
}
