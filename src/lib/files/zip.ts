// "Download all (ZIP)" (tool-specifications §2.2). fflate loads on intent.

import { uniqueNames } from "./names";

export type ZipEntry = {
  name: string;
  data: Uint8Array;
  /** Already-compressed formats (PDF, JPEG, PNG, WebP, AVIF) are stored, not deflated. */
  compressed?: boolean;
};

export async function createZip(entries: readonly ZipEntry[]): Promise<Uint8Array> {
  const { zip } = await import("fflate");
  const names = uniqueNames(entries.map((entry) => entry.name));
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  entries.forEach((entry, i) => {
    files[names[i] ?? entry.name] = [entry.data, { level: entry.compressed ? 0 : 6 }];
  });
  return new Promise((resolve, reject) => {
    zip(files, (error, data) => (error ? reject(error) : resolve(data)));
  });
}
