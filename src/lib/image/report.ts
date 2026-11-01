// What remove-exif-data shows before removing (tool-specifications §4.4):
// metadata grouped, Location (GPS) first, as plain text. Pure: takes exifr's
// merged output plus the container facts from `findMetadata`.

import type { MetadataBlocks } from "./metadata";

export type MetadataGroupId = "location" | "camera" | "datetime" | "software" | "other";

export type MetadataEntry = { label: string; value: string };

export type MetadataGroup = { id: MetadataGroupId; label: string; entries: MetadataEntry[] };

export type MetadataReport = {
  /** Only groups with entries, in display order. */
  groups: MetadataGroup[];
  /** EXIF orientation (1 = none). Kept by default, so it isn't listed as removed. */
  orientation: number;
  /** Total number of fields found (each listed field counts, plus the "+ n more" ones). */
  fieldCount: number;
};

const GROUP_LABELS: Record<MetadataGroupId, string> = {
  location: "Location (GPS)",
  camera: "Camera & device",
  datetime: "Date & time",
  software: "Software",
  other: "Other",
};

/** Short names for the summary: "Removed: GPS location, camera details, …". */
export const GROUP_SUMMARY: Record<MetadataGroupId, string> = {
  location: "GPS location",
  camera: "camera details",
  datetime: "dates",
  software: "software",
  other: "other details",
};

/** Fields shown by name, in this order; other fields of a group are counted. */
const SHOWN: Record<Exclude<MetadataGroupId, "location">, [key: string, label: string][]> = {
  camera: [
    ["Make", "Make"],
    ["Model", "Model"],
    ["LensMake", "Lens make"],
    ["LensModel", "Lens"],
    ["BodySerialNumber", "Serial number"],
    ["SerialNumber", "Serial number"],
    ["LensSerialNumber", "Lens serial number"],
    ["CameraOwnerName", "Owner"],
    ["OwnerName", "Owner"],
  ],
  datetime: [
    ["DateTimeOriginal", "Taken"],
    ["CreateDate", "Digitized"],
    ["DateCreated", "Created"],
    ["ModifyDate", "Modified"],
    ["OffsetTimeOriginal", "Time zone"],
  ],
  software: [
    ["Software", "Software"],
    ["CreatorTool", "Created with"],
    ["HostComputer", "Device"],
    ["ProcessingSoftware", "Processed with"],
  ],
  other: [
    ["Artist", "Artist"],
    ["Byline", "Author"],
    ["Creator", "Creator"],
    ["Copyright", "Copyright"],
    ["Rights", "Rights"],
    ["ImageDescription", "Description"],
    ["UserComment", "Comment"],
    ["Caption", "Caption"],
    ["City", "City"],
    ["Country", "Country"],
  ],
};

const CAMERA = new Set([
  "FNumber",
  "ExposureTime",
  "ISO",
  "FocalLength",
  "FocalLengthIn35mmFormat",
  "Flash",
  "ExposureProgram",
  "ExposureMode",
  "ExposureCompensation",
  "MeteringMode",
  "WhiteBalance",
  "ApertureValue",
  "ShutterSpeedValue",
  "BrightnessValue",
  "MaxApertureValue",
  "SubjectArea",
  "SceneType",
  "SceneCaptureType",
  "SensingMethod",
  "LensInfo",
  "DigitalZoomRatio",
  "MakerNote",
]);
const DATETIME = new Set([
  "DateTimeOriginal",
  "CreateDate",
  "ModifyDate",
  "DateCreated",
  "MetadataDate",
  "OffsetTime",
  "OffsetTimeOriginal",
  "OffsetTimeDigitized",
  "SubSecTime",
  "SubSecTimeOriginal",
  "SubSecTimeDigitized",
  "DateTimeDigitized",
]);
const SOFTWARE = new Set(["Software", "CreatorTool", "HostComputer", "ProcessingSoftware"]);
/** Structural tags that say nothing about the photo or its owner. */
const IGNORED = new Set([
  "Orientation",
  "XResolution",
  "YResolution",
  "ResolutionUnit",
  "YCbCrPositioning",
  "ExifVersion",
  "FlashpixVersion",
  "ColorSpace",
  "ComponentsConfiguration",
  "ExifImageWidth",
  "ExifImageHeight",
  "GPSVersionID",
  "latitude",
  "longitude",
  "xmlns",
  "about",
]);

const pad = (n: number) => String(n).padStart(2, "0");

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const MAX_VALUE = 200;

/** A readable text value, or null for binary data and empty values. */
export function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : formatDate(value);
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (key === "ExposureTime") return value < 1 ? `1/${Math.round(1 / value)} s` : `${value} s`;
    if (key === "FNumber") return `f/${value}`;
    if (key === "FocalLength") return `${value} mm`;
    if (key === "GPSAltitude") return `${Math.round(value * 10) / 10} m`;
    return String(Math.round(value * 1000) / 1000);
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) => formatValue(key, v)).filter((v): v is string => v !== null);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    // XMP language alternatives: { value: "…", lang: "x-default" }.
    const inner = (value as { value?: unknown }).value;
    return inner !== undefined ? formatValue(key, inner) : null;
  }
  const text = String(value)
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text;
}

/** 51.507361, -0.127750 → "51.50736° N, 0.12775° W". */
export function formatCoordinates(latitude: number, longitude: number): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(5)}° ${value >= 0 ? positive : negative}`;
  return `${part(latitude, "N", "S")}, ${part(longitude, "E", "W")}`;
}

function groupOf(key: string): MetadataGroupId {
  if (key.startsWith("GPS")) return "location";
  if (CAMERA.has(key) || SHOWN.camera.some(([k]) => k === key)) return "camera";
  if (DATETIME.has(key)) return "datetime";
  if (SOFTWARE.has(key)) return "software";
  return "other";
}

/**
 * Groups exifr output (merged, translated, revived) and the container facts
 * into the inspect view.
 */
export function buildReport(
  tags: Record<string, unknown> | undefined,
  blocks: MetadataBlocks,
  orientation: number,
): MetadataReport {
  const fields = tags ?? {};
  const groups = new Map<MetadataGroupId, MetadataEntry[]>(
    (Object.keys(GROUP_LABELS) as MetadataGroupId[]).map((id) => [id, []]),
  );
  const extra = new Map<MetadataGroupId, number>();
  const shownKeys = new Set<string>();
  let fieldCount = 0;

  const latitude = fields.latitude;
  const longitude = fields.longitude;
  if (typeof latitude === "number" && typeof longitude === "number") {
    groups.get("location")!.push({
      label: "Coordinates",
      value: formatCoordinates(latitude, longitude),
    });
    fieldCount++;
    for (const key of ["GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef"]) {
      shownKeys.add(key);
    }
  }
  const altitude = formatValue("GPSAltitude", fields.GPSAltitude);
  if (altitude) {
    groups.get("location")!.push({ label: "Altitude", value: altitude });
    shownKeys.add("GPSAltitude");
    shownKeys.add("GPSAltitudeRef");
    fieldCount++;
  }

  for (const [id, list] of Object.entries(SHOWN) as [MetadataGroupId, [string, string][]][]) {
    const entries = groups.get(id)!;
    for (const [key, label] of list) {
      const value = formatValue(key, fields[key]);
      shownKeys.add(key);
      if (!value || entries.some((e) => e.label === label && e.value === value)) continue;
      entries.push({ label, value });
      fieldCount++;
    }
  }

  for (const [key, value] of Object.entries(fields)) {
    if (shownKeys.has(key) || IGNORED.has(key)) continue;
    // Binary blobs (maker notes, embedded data) are not shown but still count.
    if (formatValue(key, value) === null && !(value instanceof Uint8Array)) continue;
    const id = groupOf(key);
    extra.set(id, (extra.get(id) ?? 0) + 1);
    fieldCount++;
  }

  const other = groups.get("other")!;
  if (blocks.comments > 0) {
    other.push({ label: "Comments", value: String(blocks.comments) });
    fieldCount += blocks.comments;
  }
  if (blocks.text.length > 0) {
    other.push({ label: "Text fields", value: [...new Set(blocks.text)].join(", ") });
    fieldCount += blocks.text.length;
  }
  if (blocks.time) {
    groups.get("datetime")!.push({ label: "Last modified", value: "Saved in the file" });
    fieldCount++;
  }
  if (blocks.other > 0) {
    other.push({
      label: "Camera-specific data",
      value: `${blocks.other} block${blocks.other > 1 ? "s" : ""}`,
    });
    fieldCount += blocks.other;
  }
  if (blocks.xmp && fieldCount === 0) {
    other.push({ label: "XMP metadata", value: "Present" });
    fieldCount++;
  }
  if (blocks.iptc && !Object.keys(fields).some((k) => SHOWN.other.some(([s]) => s === k))) {
    other.push({ label: "IPTC metadata", value: "Present" });
    fieldCount++;
  }

  const result: MetadataGroup[] = [];
  for (const [id, entries] of groups) {
    const more = extra.get(id) ?? 0;
    if (more > 0) {
      entries.push({
        label: entries.length > 0 ? "More" : "Fields",
        value: `${entries.length > 0 ? "+ " : ""}${more} ${more === 1 ? "field" : "fields"}`,
      });
    }
    if (entries.length > 0) result.push({ id, label: GROUP_LABELS[id], entries });
  }
  return { groups: result, orientation, fieldCount };
}

/** "GPS location, camera details and dates". */
export function summarizeGroups(ids: readonly MetadataGroupId[]): string {
  const names = ids.map((id) => GROUP_SUMMARY[id]);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
