// JPG to PDF logic (tool-specifications §3.4). Runs in logic.worker.ts; no DOM.
// JPEG and PNG are embedded as they are (no re-encoding). Other formats are
// decoded by the browser and re-encoded (`Decoder`, supplied by the worker).

import {
  concatTransformationMatrix,
  drawObject,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  type PDFImage,
} from "pdf-lib";
import { isOutOfMemory, toolErrors, ToolError } from "@/lib/errors";
import { describeKind, detectFileType, type FileKind } from "@/lib/files/sniff";
import {
  jpegOrientation,
  orientationMatrix,
  placeImage,
  swapsSides,
  type LayoutOptions,
} from "./layout";
import { meta } from "./meta";

export type { LayoutOptions } from "./layout";

export type ImageInput = { name: string; bytes: ArrayBuffer };

/** Re-encodes an image the PDF can't embed directly: PNG if it has transparency, else JPEG. */
export type Decoder = (
  bytes: ArrayBuffer,
  kind: FileKind,
) => Promise<{ format: "png" | "jpeg"; bytes: ArrayBuffer }>;

const IMAGE_KINDS = new Set<FileKind>(["jpeg", "png", "webp", "gif", "bmp", "avif", "heic"]);
const FORMATS = "JPG, PNG, WebP, GIF, BMP, AVIF and HEIC images";

/** The image type, checked by magic bytes; E_UNSUPPORTED_FORMAT otherwise. */
export function imageKind(input: ImageInput): FileKind {
  const kind = detectFileType(
    new Uint8Array(input.bytes, 0, Math.min(input.bytes.byteLength, 1024)),
  );
  if (!kind || !IMAGE_KINDS.has(kind)) {
    throw toolErrors.unsupportedFormat({
      name: input.name,
      detected: kind ? describeKind(kind) : undefined,
      tool: meta.name,
      formats: FORMATS,
    });
  }
  return kind;
}

/** The message for a HEIC file the browser can't decode (D-6: full HEIC support ships in Phase 6). */
export function heicUnsupported(name: string): ToolError {
  return new ToolError(
    "E_UNSUPPORTED_FORMAT",
    `${name} is a HEIC photo, which this browser can’t open yet. Use Safari, or save the photo as JPG first (on iPhone: Settings › Camera › Formats › Most Compatible).`,
    { fileName: name },
  );
}

async function embed(
  doc: PDFDocument,
  input: ImageInput,
  decode: Decoder,
): Promise<{ image: PDFImage; orientation: number }> {
  const kind = imageKind(input);
  try {
    if (kind === "jpeg") {
      return {
        image: await doc.embedJpg(input.bytes),
        orientation: jpegOrientation(new Uint8Array(input.bytes)),
      };
    }
    if (kind === "png") {
      try {
        return { image: await doc.embedPng(input.bytes), orientation: 1 };
      } catch {
        // Unusual PNGs pdf-lib can't read are decoded by the browser instead.
      }
    }
  } catch (error) {
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw toolErrors.corrupt(input.name, error);
  }
  let decoded: Awaited<ReturnType<Decoder>>;
  try {
    decoded = await decode(input.bytes, kind);
  } catch (error) {
    if (error instanceof ToolError) throw error;
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    if (kind === "heic") throw heicUnsupported(input.name);
    throw toolErrors.corrupt(input.name, error);
  }
  // Browser decoding already applies EXIF orientation.
  const image =
    decoded.format === "png"
      ? await doc.embedPng(decoded.bytes)
      : await doc.embedJpg(decoded.bytes);
  return { image, orientation: 1 };
}

/** One page per image, in order, each placed per the layout options. */
export async function imagesToPdf(
  inputs: readonly ImageInput[],
  options: LayoutOptions,
  decode: Decoder,
  onProgress?: (value: number, label: string) => void,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (inputs.length === 0) throw toolErrors.invalidInput("Add at least one image.");
  try {
    const doc = await PDFDocument.create();
    for (const [index, input] of inputs.entries()) {
      onProgress?.(
        index / (inputs.length + 1),
        `Adding ${input.name} (${index + 1} of ${inputs.length})`,
      );
      const { image, orientation } = await embed(doc, input, decode);
      const swap = swapsSides(orientation);
      const width = swap ? image.height : image.width;
      const height = swap ? image.width : image.height;
      const placed = placeImage(width, height, options);
      const page = doc.addPage(placed.page);
      if (orientation === 1) {
        page.drawImage(image, {
          x: placed.x,
          y: placed.y,
          width: placed.width,
          height: placed.height,
        });
      } else {
        // Keep the original JPEG data and turn it upright with a transform: no quality loss.
        const name = page.node.newXObject("Image", image.ref);
        page.pushOperators(
          pushGraphicsState(),
          concatTransformationMatrix(...orientationMatrix(orientation, placed)),
          drawObject(name),
          popGraphicsState(),
        );
      }
    }
    onProgress?.(inputs.length / (inputs.length + 1), "Saving the PDF");
    const bytes = await doc.save();
    onProgress?.(1, "Done");
    return { bytes, pageCount: doc.getPageCount() };
  } catch (error) {
    if (error instanceof ToolError) throw error;
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Worker protocol (logic.worker.ts)

export type JpgToPdfJob =
  | { op: "inspect"; file: ImageInput }
  | { op: "convert"; files: ImageInput[]; options: LayoutOptions };

export type JpgToPdfJobResult =
  | { op: "inspect"; width: number; height: number; kind: FileKind }
  | { op: "convert"; bytes: ArrayBuffer; pageCount: number };
