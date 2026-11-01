// Remove EXIF Data (tool-specifications §4.4): names and summaries. The
// metadata work itself runs in the shared image worker (src/lib/image). No
// dependencies, so the UI imports it directly.

import { outputFileName } from "@/lib/files/names";
import type { ImageKind } from "@/lib/image/formats";
import { summarizeGroups, type MetadataReport } from "@/lib/image/report";

export const ACCEPTED: readonly ImageKind[] = ["jpeg", "png", "webp"];

export type Mode = "keep-orientation" | "everything";

const EXTENSIONS: Partial<Record<ImageKind, string[]>> = {
  jpeg: ["jpg", "jpeg", "jfif"],
  png: ["png"],
  webp: ["webp"],
};

/** "IMG_1234.JPEG" → "IMG_1234-no-metadata.JPEG": the original extension when it fits the type. */
export function cleanedName(original: string, kind: ImageKind): string {
  const dot = original.lastIndexOf(".");
  const ext = dot > 0 ? original.slice(dot + 1) : "";
  const known = EXTENSIONS[kind] ?? [];
  const keep = known.includes(ext.toLowerCase()) ? ext : (known[0] ?? kind);
  return outputFileName(original, "no-metadata", keep);
}

/** The per-file result line: what was removed, in words. */
export function removedSummary(report: MetadataReport, mode: Mode, reencoded: boolean): string {
  const groups = report.groups.map((group) => group.id);
  const orientationKept = mode === "keep-orientation" && report.orientation !== 1;
  if (groups.length === 0) {
    if (mode === "everything" && report.orientation !== 1) {
      return "Removed: orientation tag (photo turned upright)";
    }
    return orientationKept
      ? "Nothing to remove apart from the orientation, which was kept"
      : "No metadata found: the file is unchanged";
  }
  const parts = [`Removed: ${summarizeGroups(groups)}`];
  if (orientationKept) parts.push("orientation kept");
  if (reencoded) parts.push("turned upright");
  return parts.join(" · ");
}

/** Short status for the list before removing: "GPS location found", "No metadata". */
export function foundSummary(report: MetadataReport): { text: string; location: boolean } {
  const location = report.groups.some((group) => group.id === "location");
  if (report.fieldCount === 0) return { text: "No metadata found", location };
  const fields = `${report.fieldCount} ${report.fieldCount === 1 ? "field" : "fields"}`;
  return { text: location ? `GPS location and ${fields} found` : `${fields} found`, location };
}
