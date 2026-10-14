// First-page PDF thumbnails for the FileList (tool-specifications §2.1).
// pdf.js and its worker load on intent (the first time a PDF is added), and
// its assets come from our own origin (architecture §8.2, P1-T20).

import type * as PdfJs from "pdfjs-dist";

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

/**
 * Renders page 1 to a PNG at `width` CSS pixels (times the device pixel
 * ratio). Returns null when the PDF can't be rendered (damaged, password
 * protected): the list then shows a generic icon.
 */
export async function renderPdfThumbnail(file: Blob, width: number): Promise<Blob | null> {
  let task: PdfJs.PDFDocumentLoadingTask | undefined;
  try {
    const lib = await loadPdfJs();
    task = lib.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      wasmUrl: `${ASSETS}/wasm/`,
      cMapUrl: `${ASSETS}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${ASSETS}/standard_fonts/`,
      iccUrl: `${ASSETS}/iccs/`,
      // Never follow links or fetch anything a PDF points to.
      disableAutoFetch: true,
      disableStream: true,
    });
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const scale =
      (width * Math.min(window.devicePixelRatio || 1, 2)) / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    await page.render({ canvas, viewport }).promise;
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch {
    return null;
  } finally {
    await task?.destroy();
  }
}
