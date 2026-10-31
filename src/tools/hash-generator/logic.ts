// Hashing and HMAC (tool-specifications §5.9) with hash-wasm, the same code
// for text (main thread) and files (worker, streamed in chunks so memory
// stays flat). No DOM, no React.

import {
  createHMAC,
  createMD5,
  createSHA1,
  createSHA256,
  createSHA384,
  createSHA512,
  type IHasher,
} from "hash-wasm";
import { ALGORITHMS, type Algorithm } from "./constants";
import type { Digests } from "./format";

export { findMatch, formatDigest, toBase64, toHex } from "./format";
export type { Digests } from "./format";

const FACTORIES: Record<Algorithm, () => Promise<IHasher>> = {
  md5: createMD5,
  sha1: createSHA1,
  sha256: createSHA256,
  sha384: createSHA384,
  sha512: createSHA512,
};

/** HMAC key as text (UTF-8) or bytes; null for a plain hash. */
export type HmacKey = string | Uint8Array | null;

/** One hasher per algorithm; with a key, HMAC (SHA family only, §5.9). */
async function createHashers(
  algorithms: readonly Algorithm[],
  hmacKey: HmacKey,
): Promise<[Algorithm, IHasher][]> {
  const selected = ALGORITHMS.filter(
    (algorithm) => algorithms.includes(algorithm) && (hmacKey === null || algorithm !== "md5"),
  );
  return Promise.all(
    selected.map(async (algorithm): Promise<[Algorithm, IHasher]> => {
      const hasher =
        hmacKey === null
          ? await FACTORIES[algorithm]()
          : await createHMAC(FACTORIES[algorithm](), hmacKey);
      hasher.init();
      return [algorithm, hasher];
    }),
  );
}

function finish(hashers: [Algorithm, IHasher][]): Digests {
  return Object.fromEntries(
    hashers.map(([algorithm, hasher]) => [algorithm, hasher.digest("binary").slice()]),
  );
}

/** Hashes of the UTF-8 bytes of `text`. */
export async function hashText(
  text: string,
  algorithms: readonly Algorithm[],
  hmacKey: HmacKey,
): Promise<Digests> {
  const hashers = await createHashers(algorithms, hmacKey);
  const bytes = new TextEncoder().encode(text);
  for (const [, hasher] of hashers) hasher.update(bytes);
  return finish(hashers);
}

/** Bytes read from a file at a time: large enough to be fast, small enough to keep memory flat. */
export const CHUNK_BYTES = 4 * 2 ** 20;

/** Hashes a file chunk by chunk; never holds more than one chunk in memory. */
export async function hashBlob(
  blob: Blob,
  algorithms: readonly Algorithm[],
  hmacKey: HmacKey,
  onProgress?: (done: number) => void,
  chunkBytes = CHUNK_BYTES,
): Promise<Digests> {
  const hashers = await createHashers(algorithms, hmacKey);
  for (let start = 0; start < blob.size; start += chunkBytes) {
    const chunk = new Uint8Array(await blob.slice(start, start + chunkBytes).arrayBuffer());
    for (const [, hasher] of hashers) hasher.update(chunk);
    onProgress?.(Math.min(start + chunkBytes, blob.size) / blob.size);
  }
  return finish(hashers);
}

// ---------------------------------------------------------------------------
// Worker job (files)

export type HashFileJob = { file: Blob; algorithms: Algorithm[]; hmacKey: HmacKey };
export type HashFileResult = Digests;
