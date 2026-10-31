// Unit tests for lib/errors, lib/storage and lib/detect.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/mini";
import { detect, detectorIds, DETECTORS } from "./detect";
import { base64Detector } from "./detect/base64";
import { jsonDetector } from "./detect/json";
import { jwtDetector } from "./detect/jwt";
import { unixTimestampDetector } from "./detect/unix-timestamp";
import { urlDetector, urlEncodedDetector } from "./detect/url";
import { uuidDetector } from "./detect/uuid";
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

  it("unix-timestamp: 10, 13 or 16 digits in 2000–2099", () => {
    expect(unixTimestampDetector.detect("1700000000")).toBe(0.8);
    expect(unixTimestampDetector.detect(" 1700000000000\n")).toBe(0.8);
    expect(unixTimestampDetector.detect("1700000000000000")).toBe(0.8);
    // Wrong length, sign, decimals, or outside the plausible range.
    expect(unixTimestampDetector.detect("170000000")).toBe(0);
    expect(unixTimestampDetector.detect("17000000000")).toBe(0);
    expect(unixTimestampDetector.detect("-1700000000")).toBe(0);
    expect(unixTimestampDetector.detect("1700000000.5")).toBe(0);
    expect(unixTimestampDetector.detect("9999999999")).toBe(0);
    expect(unixTimestampDetector.detect("0000000000000")).toBe(0);
    expect(unixTimestampDetector.detect("4815162342")).toBe(0);
    expect(unixTimestampDetector.detect("x".repeat(10_000))).toBe(0);
  });

  it("base64: text or known files, never random words or hex", () => {
    const b64 = (text: string) => Buffer.from(text).toString("base64");
    expect(base64Detector.detect(b64("Hello, world! This is Base64."))).toBe(0.7);
    expect(base64Detector.detect(b64("Grüße 👋 こんにちは and more text"))).toBe(0.7);
    // URL-safe without padding, and wrapped lines.
    const urlSafe = b64("subjects?>>>").replace(/\+/g, "-").replace(/\//g, "_");
    expect(urlSafe).toBe("c3ViamVjdHM_Pj4-");
    expect(base64Detector.detect(urlSafe)).toBe(0.7);
    expect(base64Detector.detect(b64("x".repeat(120)).replace(/(.{76})/g, "$1\n"))).toBe(0.7);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2]);
    expect(base64Detector.detect(png.toString("base64"))).toBe(0.9);
    expect(base64Detector.detect(`data:image/png;base64,${png.toString("base64")}`)).toBe(0.9);

    expect(base64Detector.detect(b64("short"))).toBe(0); // under 16 characters
    expect(base64Detector.detect("HelloWorldFooBar")).toBe(0);
    expect(
      base64Detector.detect("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
    ).toBe(0);
    expect(base64Detector.detect("1700000000000000")).toBe(0);
    expect(base64Detector.detect(`${b64("Hello, world! Hello!")}=`)).toBe(0); // bad padding
    expect(base64Detector.detect("eyJhbGciOiJIUzI1NiJ9.e30.abc")).toBe(0);
    expect(
      base64Detector.detect(
        Buffer.from(Uint8Array.from({ length: 30 }, (_, i) => i * 9)).toString("base64"),
      ),
    ).toBe(0);
  });

  it("base64: stays within 1 ms on 10 KB", () => {
    const text = Buffer.from("Lorem ipsum dolor sit amet. ".repeat(400)).toString("base64");
    expect(text.length).toBeGreaterThan(10_000);
    base64Detector.detect(text); // warm up
    const runs = 50;
    const batches = Array.from({ length: 5 }, () => {
      const started = performance.now();
      for (let i = 0; i < runs; i++) base64Detector.detect(text);
      return (performance.now() - started) / runs;
    });
    expect(Math.min(...batches)).toBeLessThan(1);
  });

  it("url: http(s) URLs only", () => {
    expect(urlDetector.detect(" https://example.com/a?b=1#c ")).toBe(0.9);
    expect(urlDetector.detect("http://[::1]:3000/")).toBe(0.9);
    expect(urlDetector.detect("ftp://example.com")).toBe(0);
    expect(urlDetector.detect("example.com")).toBe(0);
    expect(urlDetector.detect("see https://example.com for details")).toBe(0);
    expect(urlDetector.detect("https://")).toBe(0);
    expect(urlDetector.detect(`https://example.com/${"a".repeat(9000)}`)).toBe(0);
  });

  it("url-encoded: escapes that decode cleanly", () => {
    expect(urlEncodedDetector.detect("caf%C3%A9%20au%20lait")).toBe(0.8);
    expect(urlEncodedDetector.detect("name=Ada%20Lovelace&city=K%C3%B6ln")).toBe(0.8);
    expect(urlEncodedDetector.detect("100%25 sure")).toBe(0.6);
    expect(urlEncodedDetector.detect("no escapes here")).toBe(0);
    expect(urlEncodedDetector.detect("50% off")).toBe(0);
    expect(urlEncodedDetector.detect("bad%C3%28utf8")).toBe(0);
    // A long value cut in the middle of "é" (%C3%A9) still matches.
    const long = `${"%C3%A9".repeat(700)}`;
    expect(long.length).toBeGreaterThan(4096);
    expect(urlEncodedDetector.detect(long)).toBe(0.8);
  });

  it("url and url-encoded: stay within 1 ms on 10 KB", () => {
    const encoded = encodeURIComponent("Grüße aus Köln, ".repeat(450));
    const url = `https://example.com/?q=${encodeURIComponent("x ".repeat(3000))}`;
    expect(encoded.length).toBeGreaterThan(10_000);
    for (const [detector, text] of [
      [urlEncodedDetector, encoded],
      [urlDetector, url],
    ] as const) {
      detector.detect(text); // warm up
      const runs = 50;
      const batches = Array.from({ length: 5 }, () => {
        const started = performance.now();
        for (let i = 0; i < runs; i++) detector.detect(text);
        return (performance.now() - started) / runs;
      });
      expect(Math.min(...batches)).toBeLessThan(1);
    }
  });

  it("uuid: RFC 9562 format", () => {
    expect(uuidDetector.detect("919108f7-52d1-4320-9bac-f847db4148a8")).toBe(0.95);
    expect(uuidDetector.detect(" {017F22E2-79B0-7CC3-98C4-DC0C0C07398F}\n")).toBe(0.95);
    expect(uuidDetector.detect("urn:uuid:c232ab00-9414-11ec-b3c8-9f6bdeced846")).toBe(0.95);
    expect(uuidDetector.detect("00000000-0000-0000-0000-000000000000")).toBe(0.8);
    // Version 0 or 9, wrong variant, no hyphens, or extra text.
    expect(uuidDetector.detect("919108f7-52d1-0320-9bac-f847db4148a8")).toBe(0);
    expect(uuidDetector.detect("919108f7-52d1-4320-cbac-f847db4148a8")).toBe(0);
    expect(uuidDetector.detect("919108f752d143209bacf847db4148a8")).toBe(0);
    expect(uuidDetector.detect("id: 919108f7-52d1-4320-9bac-f847db4148a8")).toBe(0);
  });

  it("jwt: three base64url parts with a JSON header that has alg", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(jwtDetector.detect(jwt)).toBe(0.98);
    expect(jwtDetector.detect(` Bearer ${jwt}\n`)).toBe(0.98);
    // Unsecured tokens have an empty signature.
    expect(jwtDetector.detect("eyJhbGciOiJub25lIn0.e30.")).toBe(0.98);
    // No alg, not JSON, wrong number of parts, or not base64url.
    expect(jwtDetector.detect("eyJ0eXAiOiJKV1QifQ.e30.c2ln")).toBe(0);
    expect(jwtDetector.detect("aGVsbG8.e30.c2ln")).toBe(0);
    expect(jwtDetector.detect("example.com.org")).toBe(0);
    expect(jwtDetector.detect("eyJhbGciOiJIUzI1NiJ9.e30")).toBe(0);
    expect(jwtDetector.detect("eyJhbGciOiJIUzI1NiJ9.e3+0.sig")).toBe(0);
  });

  it("detect sorts by confidence, then precedence", () => {
    expect(detectorIds()).toEqual([
      "jwt",
      "json",
      "unix-timestamp",
      "base64",
      "url",
      "url-encoded",
      "uuid",
    ]);
    expect(detect('{"a":1}')).toEqual([{ id: "json", confidence: 0.95 }]);
    const tie = detect("x", [
      { id: "base64", detect: () => 0.5 },
      { id: "jwt", detect: () => 0.5 },
      { id: "none", detect: () => 0 },
    ]);
    expect(tie.map((m) => m.id)).toEqual(["jwt", "base64"]);
    expect(DETECTORS).toHaveLength(7);
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
