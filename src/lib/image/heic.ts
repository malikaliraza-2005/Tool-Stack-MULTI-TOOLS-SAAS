// HEIC/HEIF decoding with libheif (D-6). The decoder is the unmodified
// libheif-js build served from /vendor/ (scripts/copy-libheif-assets.mjs) and
// imported at run time, on intent, inside the image worker: it is never part
// of a Sprigkit bundle, so it can be replaced with a compatible build.

import type { Pixels } from "./pixels";

/** Must match the installed libheif-js (checked by a unit test). */
export const LIBHEIF_VERSION = "1.23.5";
export const LIBHEIF_BASE = `/vendor/libheif-js-${LIBHEIF_VERSION}`;
const BUNDLE_URL = `${LIBHEIF_BASE}/libheif-wasm/libheif-bundle.mjs`;

/** The parts of libheif's Emscripten API used here. */
type HeifImage = {
  get_width(): number;
  get_height(): number;
  display(target: Pixels, done: (result: Pixels | null) => void): void;
  free(): void;
};
export type LibHeif = { HeifDecoder: new () => { decode(bytes: Uint8Array): HeifImage[] } };

let loader: () => Promise<LibHeif> = async () => {
  // A URL webpack must not resolve: the file is served as is from /vendor/.
  const bundle = (await import(/* webpackIgnore: true */ BUNDLE_URL)) as {
    default: () => LibHeif | Promise<LibHeif>;
  };
  return bundle.default();
};
let ready: Promise<LibHeif> | undefined;

/** Unit tests load libheif from node_modules instead of the /vendor/ URL. */
export function setLibHeifLoader(load: () => Promise<LibHeif>): void {
  loader = load;
  ready = undefined;
}

/**
 * Decodes the primary image of a HEIC/HEIF file to RGBA. libheif applies the
 * file's rotation and mirroring (irot/imir), so the result is upright.
 */
export async function decodeHeic(bytes: ArrayBuffer): Promise<Pixels> {
  ready ??= loader().catch((error: unknown) => {
    ready = undefined; // let a later attempt try again
    throw error;
  });
  const libheif = await ready;
  const images = new libheif.HeifDecoder().decode(new Uint8Array(bytes));
  const image = images[0];
  if (!image) throw new Error("No image in this HEIC file");
  try {
    const width = image.get_width();
    const height = image.get_height();
    const target: Pixels = { data: new Uint8ClampedArray(width * height * 4), width, height };
    const decoded = await new Promise<Pixels | null>((resolve) => image.display(target, resolve));
    if (!decoded) throw new Error("libheif could not decode the image");
    return target;
  } finally {
    for (const item of images) item.free();
  }
}
