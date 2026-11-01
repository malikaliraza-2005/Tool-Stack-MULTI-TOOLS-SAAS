import { describe, expect, it } from "vitest";
import type { MetadataReport } from "@/lib/image/report";
import { cleanedName, foundSummary, removedSummary } from "./logic";

const report = (ids: MetadataReport["groups"][number]["id"][], orientation = 1, fieldCount = 5) =>
  ({
    groups: ids.map((id) => ({ id, label: id, entries: [{ label: "x", value: "y" }] })),
    orientation,
    fieldCount,
  }) satisfies MetadataReport;

describe("cleanedName", () => {
  it("keeps the original extension when it matches the type", () => {
    expect(cleanedName("IMG_1234.JPEG", "jpeg")).toBe("IMG_1234-no-metadata.JPEG");
    expect(cleanedName("scan.png", "png")).toBe("scan-no-metadata.png");
  });

  it("uses the type's extension otherwise", () => {
    expect(cleanedName("photo.png", "jpeg")).toBe("photo-no-metadata.jpg");
    expect(cleanedName("photo", "webp")).toBe("photo-no-metadata.webp");
  });
});

describe("removedSummary", () => {
  it("names what was removed", () => {
    expect(
      removedSummary(report(["location", "camera", "datetime"]), "keep-orientation", false),
    ).toBe("Removed: GPS location, camera details and dates");
  });

  it("says when the orientation was kept or baked in", () => {
    expect(removedSummary(report(["location"], 6), "keep-orientation", false)).toBe(
      "Removed: GPS location · orientation kept",
    );
    expect(removedSummary(report(["location"], 6), "everything", true)).toBe(
      "Removed: GPS location · turned upright",
    );
    expect(removedSummary(report([], 6, 0), "everything", true)).toBe(
      "Removed: orientation tag (photo turned upright)",
    );
  });

  it("says when there was nothing to remove", () => {
    expect(removedSummary(report([], 1, 0), "keep-orientation", false)).toBe(
      "No metadata found: the file is unchanged",
    );
  });
});

describe("foundSummary", () => {
  it("leads with the location", () => {
    expect(foundSummary(report(["location", "camera"], 1, 7))).toEqual({
      text: "GPS location and 7 fields found",
      location: true,
    });
    expect(foundSummary(report(["camera"], 1, 1)).text).toBe("1 field found");
    expect(foundSummary(report([], 1, 0)).text).toBe("No metadata found");
  });
});
