// Loads the jSquash WASM codecs in Node for unit tests: the same `codecs`
// module the worker uses, with each codec initialised from node_modules
// (in the browser they fetch their .wasm themselves).

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

async function wasm(pkg: string, file: string): Promise<WebAssembly.Module> {
  const root = dirname(require.resolve(`@jsquash/${pkg}/package.json`));
  return WebAssembly.compile(await readFile(join(root, file)));
}

/** Node has no ImageData; the codecs construct it. */
class NodeImageData {
  readonly colorSpace = "srgb";
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}
}

// `init` signatures differ between the emscripten and wasm-bindgen builds; all accept a module.
type Init = (module: WebAssembly.Module) => Promise<unknown>;

let ready: Promise<void> | undefined;

export function loadNodeCodecs(): Promise<void> {
  ready ??= (async () => {
    (globalThis as { ImageData?: unknown }).ImageData ??= NodeImageData;
    const inits: [Promise<{ init: unknown }>, string, string][] = [
      [import("@jsquash/jpeg/decode"), "jpeg", "codec/dec/mozjpeg_dec.wasm"],
      [import("@jsquash/jpeg/encode"), "jpeg", "codec/enc/mozjpeg_enc.wasm"],
      [import("@jsquash/png/decode"), "png", "codec/pkg/squoosh_png_bg.wasm"],
      [import("@jsquash/webp/decode"), "webp", "codec/dec/webp_dec.wasm"],
      [import("@jsquash/webp/encode"), "webp", "codec/enc/webp_enc.wasm"],
      [import("@jsquash/avif/decode"), "avif", "codec/dec/avif_dec.wasm"],
      [import("@jsquash/avif/encode"), "avif", "codec/enc/avif_enc.wasm"],
      [import("@jsquash/oxipng/optimise"), "oxipng", "codec/pkg/squoosh_oxipng_bg.wasm"],
    ];
    await Promise.all(
      inits.map(async ([module, pkg, file]) =>
        ((await module).init as Init)(await wasm(pkg, file)),
      ),
    );
    const { initResize } = await import("@jsquash/resize");
    await (initResize as Init)(await wasm("resize", "lib/resize/pkg/squoosh_resize_bg.wasm"));
  })();
  return ready;
}
