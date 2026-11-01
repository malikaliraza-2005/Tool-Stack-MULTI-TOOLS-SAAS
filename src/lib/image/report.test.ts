import { describe, expect, it } from "vitest";
import { gpsJpeg, metadataPng, metadataWebp, redBlueJpeg } from "@/lib/files/__fixtures__/images";
import { readImageInfo } from "./formats";
import { findMetadata } from "./metadata";
import { readMetadataTags } from "./read-metadata";
import { buildReport, formatCoordinates, formatValue, summarizeGroups } from "./report";

async function reportFor(bytes: Uint8Array, kind: "jpeg" | "png" | "webp") {
  const blocks = findMetadata(bytes, kind);
  const tags = await readMetadataTags(bytes, kind, blocks);
  return buildReport(tags, blocks, readImageInfo(bytes)!.orientation);
}

const group = (report: Awaited<ReturnType<typeof reportFor>>, id: string) =>
  report.groups.find((g) => g.id === id);

describe("buildReport", () => {
  it("lists GPS first as text coordinates, then camera, dates, software and other", async () => {
    const report = await reportFor(gpsJpeg(), "jpeg");
    expect(report.groups.map((g) => g.id)).toEqual([
      "location",
      "camera",
      "datetime",
      "software",
      "other",
    ]);
    expect(group(report, "location")?.entries[0]).toEqual({
      label: "Coordinates",
      value: "51.50736° N, 0.12775° W",
    });
    expect(group(report, "camera")?.entries).toEqual([
      { label: "Make", value: "Sprigphone" },
      { label: "Model", value: "Sprig 15 Pro" },
    ]);
    expect(group(report, "datetime")?.entries).toContainEqual({
      label: "Taken",
      value: "2026-10-20 14:31:07",
    });
    expect(group(report, "software")?.entries).toEqual(
      expect.arrayContaining([
        { label: "Software", value: "SprigOS 18.1" },
        { label: "Created with", value: "Sprig Editor 2" },
      ]),
    );
    expect(group(report, "other")?.entries).toContainEqual({ label: "Comments", value: "1" });
    expect(report.orientation).toBe(6);
    expect(report.fieldCount).toBeGreaterThan(6);
  });

  it("reads PNG eXIf and text chunks", async () => {
    const report = await reportFor(metadataPng(), "png");
    expect(group(report, "location")?.entries[0]?.value).toBe("51.50736° N, 0.12775° W");
    expect(group(report, "other")?.entries).toContainEqual({
      label: "Text fields",
      value: "Software, Comment",
    });
    expect(group(report, "datetime")?.entries).toContainEqual({
      label: "Last modified",
      value: "Saved in the file",
    });
  });

  it("reads the WebP EXIF chunk", async () => {
    const report = await reportFor(metadataWebp(), "webp");
    expect(group(report, "location")?.entries[0]?.value).toBe("51.50736° N, 0.12775° W");
    expect(group(report, "camera")?.entries[0]).toEqual({ label: "Make", value: "Sprigphone" });
  });

  it("is empty for a clean file", async () => {
    const report = await reportFor(redBlueJpeg(), "jpeg");
    expect(report).toEqual({ groups: [], orientation: 1, fieldCount: 0 });
  });
});

describe("formatting", () => {
  it("formats values as plain text", () => {
    expect(formatValue("ExposureTime", 0.008)).toBe("1/125 s");
    expect(formatValue("FNumber", 1.8)).toBe("f/1.8");
    expect(formatValue("Model", "  A\u0000B  ")).toBe("A B");
    expect(formatValue("MakerNote", new Uint8Array(4))).toBeNull();
    expect(formatValue("Title", { value: "Hi", lang: "x-default" })).toBe("Hi");
    expect(formatValue("Note", "x".repeat(300))).toHaveLength(201);
  });

  it("formats coordinates with hemispheres", () => {
    expect(formatCoordinates(-33.8688, 151.2093)).toBe("33.86880° S, 151.20930° E");
  });

  it("summarizes removed groups", () => {
    expect(summarizeGroups(["location"])).toBe("GPS location");
    expect(summarizeGroups(["location", "camera", "datetime"])).toBe(
      "GPS location, camera details and dates",
    );
  });
});
