// Unit tests for lib/errors, lib/storage and lib/detect.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/mini";
import { detect, detectorIds, DETECTORS } from "./detect";
import { jsonDetector } from "./detect/json";
import {
  deserializeToolError,
  isOutOfMemory,
  serializeToolError,
  TOOL_ERROR_CODES,
  ToolError,
  toolErrors,
  toToolError,
} from "./errors";
import {
  MAX_STORED_CHARS,
  readStored,
  removeStored,
  storageKey,
  toolOptionsKey,
  writeStored,
} from "./storage";

describe("errors (tool-specifications §2.4)", () => {
  it("has every code in the taxonomy", () => {
    expect(TOOL_ERROR_CODES).toEqual([
      "E_UNSUPPORTED_FORMAT",
      "E_TOO_LARGE",
      "E_CORRUPT",
      "E_ENCRYPTED",
      "E_OUT_OF_MEMORY",
      "E_TIMEOUT",
      "E_CANCELLED",
      "E_INVALID_INPUT",
      "E_UNKNOWN",
    ]);
  });

  it("builds the message patterns", () => {
    expect(
      toolErrors.unsupportedFormat({
        name: "photo.heic",
        detected: "a HEIC image",
        tool: "Merge PDF",
        formats: "PDF files",
      }).message,
    ).toBe("photo.heic is a HEIC image. Merge PDF accepts PDF files.");
    expect(toolErrors.corrupt("a.pdf").message).toBe(
      "a.pdf couldn’t be read. It may be damaged or incomplete.",
    );
    expect(
      toolErrors.invalidInput("Expected a value.", {
        line: 3,
        column: 7,
        offset: 20,
        length: 1,
      }).message,
    ).toBe("Line 3, column 7: Expected a value.");
    expect(toolErrors.unknown("merging the PDFs").message).toBe(
      "Something unexpected happened while merging the PDFs. Nothing was uploaded. Try again.",
    );
  });

  it("maps anything thrown into a ToolError", () => {
    const tool = toolErrors.encrypted("x.pdf");
    expect(toToolError(tool, "x")).toBe(tool);
    expect(toToolError(new DOMException("aborted", "AbortError"), "x").code).toBe("E_CANCELLED");
    expect(toToolError(new RangeError("Array buffer allocation failed"), "x").code).toBe(
      "E_OUT_OF_MEMORY",
    );
    const unknown = toToolError("weird", "reading the file");
    expect(unknown.code).toBe("E_UNKNOWN");
    expect(unknown.details).toBe("weird");
    expect(isOutOfMemory(new RangeError("Maximum call stack size exceeded"))).toBe(false);
  });

  it("survives serialization across a worker boundary", () => {
    const error = toolErrors.invalidInput("Bad", { line: 1, column: 2, offset: 1, length: 1 });
    const copy = deserializeToolError(structuredClone(serializeToolError(error)));
    expect(copy).toBeInstanceOf(ToolError);
    expect(copy).toMatchObject({
      code: error.code,
      message: error.message,
      location: error.location,
    });
  });
});

describe("storage (architecture §9)", () => {
  const store = new Map<string, string>();
  const schema = z.object({ indent: z.enum(["2", "4"]), sortKeys: z.boolean() });

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses versioned keys", () => {
    expect(storageKey("theme")).toBe("ts:v1:theme");
    expect(toolOptionsKey("json-formatter")).toBe("ts:v1:opts:json-formatter");
  });

  it("round-trips valid options", () => {
    const key = toolOptionsKey("t");
    expect(writeStored(key, schema, { indent: "4", sortKeys: true })).toBe(true);
    expect(readStored(key, schema)).toEqual({ indent: "4", sortKeys: true });
    removeStored(key);
    expect(readStored(key, schema)).toBeUndefined();
  });

  it("ignores invalid or corrupt stored data", () => {
    store.set("ts:v1:opts:t", "{not json");
    expect(readStored("ts:v1:opts:t", schema)).toBeUndefined();
    store.set("ts:v1:opts:t", JSON.stringify({ indent: "8", sortKeys: true }));
    expect(readStored("ts:v1:opts:t", schema)).toBeUndefined();
  });

  it("refuses values that fail the schema, are too large, or use an unversioned key", () => {
    const text = z.object({ value: z.string() });
    expect(writeStored("ts:v1:x", text, { value: "a".repeat(MAX_STORED_CHARS) })).toBe(false);
    expect(writeStored("ts:v1:x", schema, { indent: "8" } as never)).toBe(false);
    expect(writeStored("other", schema, { indent: "2", sortKeys: false })).toBe(false);
    expect(store.size).toBe(0);
  });

  it("works without storage", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(readStored("ts:v1:x", schema)).toBeUndefined();
    expect(writeStored("ts:v1:x", schema, { indent: "2", sortKeys: false })).toBe(false);
  });
});

describe("detectors (tool-registry §5)", () => {
  it("json: objects and arrays that parse", () => {
    expect(jsonDetector.detect(' {"a": 1} ')).toBeGreaterThan(0.9);
    expect(jsonDetector.detect("[1,2,3]")).toBeGreaterThan(0.9);
    expect(jsonDetector.detect("{}")).toBe(0.5);
    expect(jsonDetector.detect('{"a": 1')).toBe(0);
    expect(jsonDetector.detect("42")).toBe(0);
    expect(jsonDetector.detect('"text"')).toBe(0);
    expect(jsonDetector.detect("eyJhbGciOiJIUzI1NiJ9.e30.abc")).toBe(0);
  });

  it("json: stays within 1 ms on 10 KB", () => {
    const text = JSON.stringify(Array.from({ length: 600 }, (_, i) => ({ id: i, name: "x" })));
    expect(text.length).toBeGreaterThan(10_000);
    jsonDetector.detect(text); // warm up
    // Best of several batches, so other test files running in parallel don't make it flaky.
    const runs = 50;
    const batches = Array.from({ length: 5 }, () => {
      const started = performance.now();
      for (let i = 0; i < runs; i++) jsonDetector.detect(text);
      return (performance.now() - started) / runs;
    });
    expect(Math.min(...batches)).toBeLessThan(1);
  });

  it("detect sorts by confidence, then precedence", () => {
    expect(detectorIds()).toEqual(["json"]);
    expect(detect('{"a":1}')).toEqual([{ id: "json", confidence: 0.95 }]);
    const tie = detect("x", [
      { id: "base64", detect: () => 0.5 },
      { id: "jwt", detect: () => 0.5 },
      { id: "none", detect: () => 0 },
    ]);
    expect(tie.map((m) => m.id)).toEqual(["jwt", "base64"]);
    expect(DETECTORS).toHaveLength(1);
  });
});

describe("pdf.js assets", () => {
  it("thumbnail asset path matches the installed pdfjs-dist version", async () => {
    const { PDFJS_VERSION } = await import("./pdf/thumbnail");
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync("node_modules/pdfjs-dist/package.json", "utf8"));
    expect(PDFJS_VERSION).toBe(pkg.version);
  });
});
