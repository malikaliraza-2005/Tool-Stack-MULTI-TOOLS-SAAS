// Reads metadata tags with exifr (remove-exif-data's inspect step). Runs in
// the image worker; exifr loads with it, on intent.

import exifr from "exifr";
import type { MetadataBlocks, MetadataContainer } from "./metadata";

const OPTIONS = {
  tiff: true,
  ifd1: false, // the embedded thumbnail's own tags
  exif: true,
  gps: true,
  interop: false,
  xmp: true,
  iptc: true,
  icc: false,
  jfif: false,
  ihdr: false,
  makerNote: false,
  userComment: true,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  mergeOutput: true,
  multiSegment: true,
  silentErrors: false,
};

/**
 * Tags found in the file, merged into one object (exifr adds `latitude` and
 * `longitude` in decimal degrees). exifr reads JPEG and PNG itself; for WebP
 * it gets the EXIF chunk's TIFF structure.
 */
export async function readMetadataTags(
  bytes: Uint8Array,
  kind: MetadataContainer,
  blocks: MetadataBlocks,
): Promise<Record<string, unknown> | undefined> {
  const input = kind === "webp" ? blocks.exif : bytes;
  if (!input) return undefined;
  // exifr drops everything when one segment is damaged, so retry with fewer.
  const attempts = [OPTIONS, { ...OPTIONS, iptc: false }, { ...OPTIONS, iptc: false, xmp: false }];
  for (const options of attempts) {
    try {
      const tags = (await exifr.parse(input, options)) as Record<string, unknown> | undefined;
      if (tags) return tags;
    } catch {
      // Try the next, smaller set; the container walk still lists what will be removed.
    }
  }
  return undefined;
}
