// "Download all (ZIP)" for image batches (tool-specifications §2.2). Images
// are already compressed, so they are stored, not deflated.

import { createZip } from "@/lib/files/zip";

export async function createZipBlob(files: readonly { name: string; blob: Blob }[]): Promise<Blob> {
  const data = await createZip(
    await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        data: new Uint8Array(await file.blob.arrayBuffer()),
        compressed: true,
      })),
    ),
  );
  return new Blob([data as BlobPart], { type: "application/zip" });
}
