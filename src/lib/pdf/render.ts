// Page rendering with pdf.js for thumbnails (FileList, PageThumbnailGrid).
// pdf.js and its worker load on intent, and its assets come from our own
// origin (architecture §8.2, P1-T20). Parsing and decoding run in pdf.js's
// worker; painting a page at thumbnail size happens on the page.

import type * as PdfJs from "pdfjs-dist";
import { toolErrors } from "@/lib/errors";

/** Must match the installed pdfjs-dist version (scripts/copy-pdfjs-assets.mjs). */
export const PDFJS_VERSION = "6.4.299";
const ASSETS = `/vendor/pdfjs-${PDFJS_VERSION}`;

let pdfjs: Promise<typeof PdfJs> | null = null;

function loadPdfJs(): Promise<typeof PdfJs> {
  pdfjs ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    return lib;
  });
  return pdfjs;
}

async function openDocument(data: Uint8Array) {
  const lib = await loadPdfJs();
  return lib.getDocument({
    data,
    wasmUrl: `${ASSETS}/wasm/`,
    cMapUrl: `${ASSETS}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${ASSETS}/standard_fonts/`,
    iccUrl: `${ASSETS}/iccs/`,
    // Never follow links or fetch anything a PDF points to.
    disableAutoFetch: true,
    disableStream: true,
  });
}

/** Device pixels per CSS pixel for thumbnails (capped: sharper isn't visible at this size). */
const pixelRatio = () => Math.min(globalThis.devicePixelRatio || 1, 2);

async function renderToBlob(page: PdfJs.PDFPageProxy, width: number, type: string) {
  const scale = (width * pixelRatio()) / page.getViewport({ scale: 1 }).width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  await page.render({ canvas, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  // Release the canvas memory now rather than at garbage collection.
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

/**
 * Renders page 1 to a PNG at `width` CSS pixels (times the device pixel
 * ratio). Returns null when the PDF can't be rendered (damaged, password
 * protected): the list then shows a generic icon.
 */
export async function renderPdfThumbnail(file: Blob, width: number): Promise<Blob | null> {
  let task: PdfJs.PDFDocumentLoadingTask | undefined;
  try {
    task = await openDocument(new Uint8Array(await file.arrayBuffer()));
    const doc = await task.promise;
    return await renderToBlob(await doc.getPage(1), width, "image/png");
  } catch {
    return null;
  } finally {
    await task?.destroy();
  }
}

export type PdfPreview = {
  pageCount: number;
  /**
   * Renders a page (0-based) to a JPEG at `width` CSS pixels, including the
   * page's own rotation. Requests run one at a time, the most recent first,
   * so pages scrolled into view win. Aborting drops a queued request.
   */
  render(index: number, width: number, signal?: AbortSignal): Promise<Blob | null>;
  destroy(): Promise<void>;
};

type Request = {
  index: number;
  width: number;
  signal?: AbortSignal;
  resolve: (blob: Blob | null) => void;
};

/** Opens a PDF for rendering many pages; call destroy() when done. */
export async function openPdfPreview(data: Uint8Array): Promise<PdfPreview> {
  const task = await openDocument(data);
  const doc = await task.promise;
  const queue: Request[] = [];
  let running = false;
  let destroyed = false;

  async function pump() {
    if (running) return;
    running = true;
    while (queue.length > 0 && !destroyed) {
      // Last in, first out: the latest requests are what's on screen now.
      const request = queue.pop()!;
      if (request.signal?.aborted) {
        request.resolve(null);
        continue;
      }
      try {
        request.resolve(
          await renderToBlob(await doc.getPage(request.index + 1), request.width, "image/jpeg"),
        );
      } catch {
        request.resolve(null);
      }
    }
    running = false;
  }

  return {
    pageCount: doc.numPages,
    render(index, width, signal) {
      return new Promise((resolve) => {
        if (destroyed) return resolve(null);
        queue.push({ index, width, signal, resolve });
        void pump();
      });
    },
    async destroy() {
      destroyed = true;
      for (const request of queue.splice(0)) request.resolve(null);
      await task.destroy();
    },
  };
}

export type PdfRenderer = {
  pageCount: number;
  /** Size of a page (0-based) in points as displayed, with its own rotation applied. */
  pageSize(index: number): Promise<[number, number]>;
  /**
   * Renders a page at `scale` (pixels per point) on a white background and
   * encodes it. Throws E_OUT_OF_MEMORY when the browser can't allocate the canvas.
   */
  renderPage(
    index: number,
    scale: number,
    type: "image/jpeg" | "image/png",
    quality?: number,
  ): Promise<Blob>;
  destroy(): Promise<void>;
};

/** Opens a PDF for full-resolution export (PDF to JPG); call destroy() when done. */
export async function openPdfRenderer(data: Uint8Array): Promise<PdfRenderer> {
  const task = await openDocument(data);
  const doc = await task.promise;
  return {
    pageCount: doc.numPages,
    async pageSize(index) {
      const viewport = (await doc.getPage(index + 1)).getViewport({ scale: 1 });
      return [viewport.width, viewport.height];
    },
    async renderPage(index, scale, type, quality) {
      const page = await doc.getPage(index + 1);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d");
      try {
        if (!context) throw toolErrors.outOfMemory();
        // White, not transparent: JPEG has no alpha, and pages are white.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, type, quality),
        );
        // A null blob means the browser couldn't allocate the canvas (iOS limits).
        if (!blob) throw toolErrors.outOfMemory();
        return blob;
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    async destroy() {
      await task.destroy();
    },
  };
}
