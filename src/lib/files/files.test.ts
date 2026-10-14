import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { ToolLimits } from "@/tools/types";
import { formatBytes, plural } from "./format";
import { checkLimits, getDeviceClass } from "./limits";
import {
  baseName,
  ensureExtension,
  outputFileName,
  sanitizeFileName,
  uniqueNames,
  userFileName,
} from "./names";
import { describeKind, detectFileType, sniffFile } from "./sniff";
import { createZip } from "./zip";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === "string" ? Array.from(v, (c) => c.charCodeAt(0)) : [v])),
  );

describe("detectFileType (magic bytes, tool-specifications §2.1)", () => {
  it.each([
    ["pdf", bytes("%PDF-1.7\n")],
    ["jpeg", bytes(0xff, 0xd8, 0xff, 0xe0)],
    ["png", bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a)],
    ["webp", bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 ")],
    ["gif", bytes("GIF89a")],
    ["bmp", bytes("BM", ...new Array(12).fill(0))],
    ["avif", bytes(0, 0, 0, 0x1c, "ftypavif", 0, 0, 0, 0, "avifmif1")],
    ["heic", bytes(0, 0, 0, 0x18, "ftypheic", 0, 0, 0, 0, "mif1")],
    ["heic", bytes(0, 0, 0, 0x18, "ftypmif1", 0, 0, 0, 0, "heic")],
  ] as const)("detects %s", (kind, data) => {
    expect(detectFileType(data)).toBe(kind);
  });

  it("finds a PDF header after leading junk within the first 1 KB", () => {
    const data = new Uint8Array(1100);
    data.set(bytes("%PDF-1.4"), 500);
    expect(detectFileType(data)).toBe("pdf");
    const late = new Uint8Array(1100);
    late.set(bytes("%PDF-1.4"), 1050);
    expect(detectFileType(late)).toBeNull();
  });

  it("returns null for unknown or empty data and ignores extensions", async () => {
    expect(detectFileType(new Uint8Array())).toBeNull();
    expect(detectFileType(bytes("hello world"))).toBeNull();
    const renamed = new File([bytes(0xff, 0xd8, 0xff, 0xdb)], "report.pdf");
    expect(await sniffFile(renamed)).toBe("jpeg");
  });

  it("describes kinds for messages", () => {
    expect(describeKind("avif")).toBe("an AVIF image");
    expect(describeKind("pdf")).toBe("a PDF document");
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 bytes"],
    [1, "1 byte"],
    [1023, "1023 bytes"],
    [1536, "1.5 KB"],
    [4.2 * 2 ** 20, "4.2 MB"],
    [42 * 2 ** 20, "42 MB"],
    [100 * 2 ** 20, "100 MB"],
    [2 ** 30, "1 GB"],
    [-5, "0 bytes"],
  ])("%d → %s", (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });

  it("pluralizes counts", () => {
    expect(plural(1, "page")).toBe("1 page");
    expect(plural(1204, "page")).toBe("1,204 pages");
  });
});

describe("checkLimits", () => {
  const MB = 2 ** 20;
  const perFile: ToolLimits = {
    desktop: { softBytes: 5 * MB, hardBytes: 50 * MB },
    mobile: { softBytes: 2 * MB, hardBytes: 10 * MB },
  };
  const total: ToolLimits = {
    desktop: { softBytes: 100 * MB, hardBytes: 500 * MB, maxFiles: 3 },
    mobile: { softBytes: 50 * MB, hardBytes: 150 * MB, maxFiles: 2 },
    per: "total",
  };

  it("accepts, warns above the soft limit, rejects above the hard limit (per file)", () => {
    const result = checkLimits(
      [
        { name: "a.json", size: MB },
        { name: "b.json", size: 6 * MB },
        { name: "c.json", size: 51 * MB },
      ],
      perFile,
      "desktop",
    );
    expect(result.map((r) => r.status)).toEqual(["ok", "warn", "reject"]);
    const rejected = result[2];
    expect(rejected?.status === "reject" && rejected.error.code).toBe("E_TOO_LARGE");
    expect(rejected?.status === "reject" && rejected.error.message).toBe(
      "c.json is 51 MB. The limit on this device is 50 MB. Try a smaller file, or a desktop browser.",
    );
  });

  it("uses the mobile limits on mobile", () => {
    expect(checkLimits([{ name: "a", size: 11 * MB }], perFile, "mobile")[0]?.status).toBe(
      "reject",
    );
  });

  it("counts the total and existing files when per is total", () => {
    const result = checkLimits(
      [
        { name: "a.pdf", size: 60 * MB },
        { name: "b.pdf", size: 50 * MB },
        { name: "c.pdf", size: 1 * MB },
      ],
      total,
      "mobile",
      { count: 0, bytes: 0 },
    );
    expect(result.map((r) => r.status)).toEqual(["warn", "warn", "reject"]);
    const third = result[2];
    // Rejected for the file count (2 on mobile), before the bytes.
    expect(third?.status === "reject" && third.error.message).toMatch(/up to 2 files/);

    const overTotal = checkLimits([{ name: "big.pdf", size: 100 * MB }], total, "mobile", {
      count: 1,
      bytes: 60 * MB,
    })[0];
    expect(overTotal?.status === "reject" && overTotal.error.message).toBe(
      "Adding big.pdf would bring the total to 160 MB. The limit on this device is 150 MB. Try fewer or smaller files.",
    );
  });
});

describe("getDeviceClass", () => {
  const nav = (userAgent: string, maxTouchPoints = 0, mobile?: boolean) => ({
    userAgent,
    maxTouchPoints,
    ...(mobile === undefined ? {} : { userAgentData: { mobile } }),
  });

  it("detects phones, tablets and iPadOS", () => {
    expect(getDeviceClass(nav("Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile"))).toBe("mobile");
    expect(getDeviceClass(nav("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)"))).toBe("mobile");
    expect(getDeviceClass(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5))).toBe(
      "mobile",
    );
    expect(getDeviceClass(nav("Mozilla/5.0 (Windows NT 10.0)", 0, true))).toBe("mobile");
  });

  it("defaults to desktop", () => {
    expect(getDeviceClass(nav("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"))).toBe("desktop");
    expect(getDeviceClass(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"))).toBe("desktop");
  });
});

describe("file names (tool-specifications §2.2)", () => {
  it("builds <original>-<action>.<ext>", () => {
    expect(outputFileName("report.pdf", "merged", "pdf")).toBe("report-merged.pdf");
    expect(outputFileName("photo.final.jpg", "compressed", "webp")).toBe(
      "photo.final-compressed.webp",
    );
    expect(outputFileName("...", "merged", "pdf")).toBe("file-merged.pdf");
  });

  it("sanitizes user-edited names and enforces the extension", () => {
    expect(userFileName("  my/merged:file  ", "pdf", "merged.pdf")).toBe("my-merged-file.pdf");
    expect(userFileName("Final.PDF", "pdf", "merged.pdf")).toBe("Final.PDF");
    expect(userFileName("", "pdf", "merged.pdf")).toBe("merged.pdf");
    expect(userFileName(".pdf", "pdf", "merged.pdf")).toBe("merged.pdf");
    expect(sanitizeFileName("a\u0000b")).toBe("a-b");
    expect(baseName(".env")).toBe(".env");
    expect(ensureExtension("a", ".json")).toBe("a.json");
  });

  it("makes names unique", () => {
    expect(uniqueNames(["a.pdf", "A.pdf", "b", "b", "a.pdf"])).toEqual([
      "a.pdf",
      "A (2).pdf",
      "b",
      "b (2)",
      "a (3).pdf",
    ]);
  });
});

describe("createZip", () => {
  it("zips entries with unique names; compressed formats are stored", async () => {
    const zip = await createZip([
      { name: "a.txt", data: new TextEncoder().encode("hello hello hello") },
      { name: "a.txt", data: new TextEncoder().encode("second") },
      { name: "doc.pdf", data: bytes("%PDF-1.7"), compressed: true },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files)).toEqual(["a.txt", "a (2).txt", "doc.pdf"]);
    expect(new TextDecoder().decode(files["a (2).txt"])).toBe("second");
  });
});
