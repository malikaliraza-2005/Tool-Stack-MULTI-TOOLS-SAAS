import { describe, expect, it } from "vitest";
import {
  buildTree,
  DEFAULT_OPTIONS,
  formatJson,
  isUnsafeInteger,
  jsonPath,
  locate,
  MAX_DEPTH,
  measure,
  parseJson,
  runJob,
  SAMPLE_JSON,
  type JsonOptions,
  type TreeNode,
} from "./logic";

const opts = (patch: Partial<JsonOptions> = {}): JsonOptions => ({ ...DEFAULT_OPTIONS, ...patch });

function format(text: string, patch: Partial<JsonOptions> = {}) {
  const result = formatJson(text, opts(patch), "format");
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result.output;
}

function minify(text: string, patch: Partial<JsonOptions> = {}) {
  const result = formatJson(text, opts(patch), "minify");
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result.output;
}

function errorOf(text: string, patch: Partial<JsonOptions> = {}) {
  const result = formatJson(text, opts(patch), "format");
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("formatJson", () => {
  it("pretty-prints with 2 spaces by default, like JSON.stringify", () => {
    const input = '{"a":1,"b":[true,null,"x"],"c":{},"d":[]}';
    expect(format(input)).toBe(JSON.stringify(JSON.parse(input), null, 2));
  });

  it("supports 4 spaces and tabs", () => {
    expect(format('{"a":[1]}', { indent: "4" })).toBe('{\n    "a": [\n        1\n    ]\n}');
    expect(format('{"a":1}', { indent: "tab" })).toBe('{\n\t"a": 1\n}');
  });

  it("is idempotent (acceptance test 1)", () => {
    for (const indent of ["2", "4", "tab"] as const) {
      const once = format(SAMPLE_JSON, { indent });
      expect(format(once, { indent })).toBe(once);
    }
  });

  it("minify then format equals format (acceptance test 2)", () => {
    for (const indent of ["2", "4", "tab"] as const) {
      expect(format(minify(SAMPLE_JSON), { indent })).toBe(format(SAMPLE_JSON, { indent }));
    }
    expect(minify(SAMPLE_JSON)).not.toMatch(/\s(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  });

  it("keeps number and string literals exactly as written", () => {
    const input =
      '{"big":123456789012345678901234567890,"exp":1E+5,"neg":-0,"esc":"a\\u00e9\\n\\/"}';
    expect(minify(input)).toBe(input);
  });

  it("sorts keys recursively when asked, keeping array order", () => {
    expect(minify('{"b":1,"a":{"d":1,"c":2},"arr":[{"z":1,"y":2}]}', { sortKeys: true })).toBe(
      '{"a":{"c":2,"d":1},"arr":[{"y":2,"z":1}],"b":1}',
    );
  });

  it("formats top-level scalars", () => {
    expect(format(' "text" ')).toBe('"text"');
    expect(format("42")).toBe("42");
  });

  it("accepts a byte order mark", () => {
    expect(minify('﻿{"a":1}')).toBe('{"a":1}');
  });

  it("accepts comments and trailing commas only in JSONC mode, and outputs strict JSON", () => {
    const jsonc = '{\n  // comment\n  "a": 1, /* block */\n  "b": [1, 2,],\n}';
    expect(minify(jsonc, { allowJsonc: true })).toBe('{"a":1,"b":[1,2]}');
    expect(errorOf(jsonc).message).toMatch(/Comments aren’t allowed/);
  });

  it("reports output stats", () => {
    const result = formatJson('{"a":"é"}', opts(), "format");
    expect(result.ok && result.stats).toEqual({ lines: 3, bytes: 15 });
  });
});

describe("error locations (acceptance test 3: five malformed fixtures)", () => {
  const cases: [name: string, input: string, line: number, column: number, message: RegExp][] = [
    ["missing comma at a line end", '{\n  "a": 1\n  "b": 2\n}', 2, 9, /after this value/],
    ["missing comma within a line", "[1 2]", 1, 4, /between values/],
    ["trailing comma", '{\n  "a": 1,\n}', 2, 9, /Trailing comma/],
    ["single quotes", "{\n  'a': 1\n}", 2, 3, /double quotes/],
    ["unclosed array", "[1, 2,\n  3", 2, 4, /closing “\]”/],
    ["unquoted key", "{\n  name: true\n}", 2, 3, /Property names need double quotes/],
    ["unterminated string", '{"a": "abc}', 1, 7, /Unterminated string/],
    ["text after the value", '{"a":1}\n{"b":2}', 2, 1, /Only one top-level value/],
    ["leading zero", "[01]", 1, 2, /leading zero/],
  ];

  it.each(cases)("%s", (_name, input, line, column, message) => {
    const error = errorOf(input);
    expect({ line: error.line, column: error.column }).toEqual({ line, column });
    expect(error.message).toMatch(message);
  });

  it("reports empty input as a missing value", () => {
    expect(errorOf("   ").message).toMatch(/Unexpected end of input/);
  });

  it("agrees with JSON.parse on what is valid in strict mode", () => {
    const samples = [
      '["\t"]',
      '"\\x"',
      "[1,]",
      "[NaN]",
      "[.5]",
      "[1.]",
      "[-]",
      '{"a":1,}',
      "[0x10]",
    ];
    for (const sample of samples) {
      let native = true;
      try {
        JSON.parse(sample);
      } catch {
        native = false;
      }
      expect(parseJson(sample, false).ok, sample).toBe(native);
    }
  });

  it("rejects nesting deeper than MAX_DEPTH without overflowing the stack", () => {
    const deep = "[".repeat(MAX_DEPTH + 1) + "]".repeat(MAX_DEPTH + 1);
    expect(errorOf(deep).message).toMatch(/nested more than/);
    const ok = "[".repeat(MAX_DEPTH) + "]".repeat(MAX_DEPTH);
    expect(minify(ok)).toBe(ok);
  });
});

describe("big numbers (acceptance test 4)", () => {
  it("detects integers beyond Number.MAX_SAFE_INTEGER", () => {
    expect(isUnsafeInteger("9007199254740991")).toBe(false);
    expect(isUnsafeInteger("9007199254740992")).toBe(true);
    expect(isUnsafeInteger("-9007199254740993")).toBe(true);
    expect(isUnsafeInteger("12345678901234567890")).toBe(true);
    expect(isUnsafeInteger("1e30")).toBe(false);
    expect(isUnsafeInteger("1.5")).toBe(false);
  });

  it("warns with the path of each big number", () => {
    const result = formatJson(
      '{"users":[{"id":1},{"id":90071992547409920}],"total":12345678901234567890}',
      opts(),
      "format",
    );
    expect(result.ok && result.bigNumbers).toEqual({
      count: 2,
      examples: [
        { path: "$.users[1].id", raw: "90071992547409920" },
        { path: "$.total", raw: "12345678901234567890" },
      ],
    });
    expect(result.ok && result.output).toContain("90071992547409920");
  });

  it("does not warn for safe numbers", () => {
    const result = formatJson("[1, 2.5, -3, 1e300]", opts(), "format");
    expect(result.ok && result.bigNumbers).toBeNull();
  });
});

describe("jsonPath", () => {
  it("uses dot notation for identifiers and brackets otherwise", () => {
    expect(jsonPath([])).toBe("$");
    expect(jsonPath(["users", 3, "email"])).toBe("$.users[3].email");
    expect(jsonPath(["first name", "a.b", "$ok", "1x"])).toBe('$["first name"]["a.b"].$ok["1x"]');
  });
});

describe("buildTree", () => {
  it("builds a compact tree with keys, indexes and raw scalars", () => {
    const result = buildTree('{"b":[1,"x"],"a":null}', opts({ sortKeys: true }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expected: TreeNode = {
      type: "object",
      children: [
        { key: "a", type: "null", raw: "null" },
        {
          key: "b",
          type: "array",
          children: [
            { key: 0, type: "number", raw: "1" },
            { key: 1, type: "string", raw: '"x"' },
          ],
        },
      ],
    };
    expect(result.root).toEqual(expected);
    expect(result.nodes).toBe(5);
  });

  it("returns located errors", () => {
    const result = buildTree("[1,", opts());
    expect(result.ok).toBe(false);
  });
});

describe("helpers", () => {
  it("locate counts lines and columns from 1", () => {
    expect(locate("ab\ncd", 0)).toEqual({ line: 1, column: 1 });
    expect(locate("ab\ncd", 4)).toEqual({ line: 2, column: 2 });
  });

  it("measure counts UTF-8 bytes, including surrogate pairs", () => {
    expect(measure("")).toEqual({ lines: 0, bytes: 0 });
    expect(measure("a\n😀")).toEqual({ lines: 2, bytes: 6 });
  });

  it("runJob dispatches worker jobs", () => {
    expect(runJob({ op: "minify", text: "[ 1 ]", options: opts() })).toMatchObject({
      ok: true,
      output: "[1]",
    });
    expect(runJob({ op: "tree", text: "[]", options: opts() })).toMatchObject({ ok: true });
  });
});

describe("large input (acceptance test 5: 20 MB)", () => {
  it("formats 20 MB of JSON", { timeout: 60_000 }, () => {
    const record = JSON.stringify({ id: 1, name: "Record name", tags: ["a", "b"], score: 0.5 });
    const count = Math.ceil((20 * 2 ** 20) / (record.length + 1));
    const input = `[${Array.from({ length: count }, () => record).join(",")}]`;
    expect(input.length).toBeGreaterThan(20 * 2 ** 20);
    const started = performance.now();
    const output = minify(input);
    const elapsed = performance.now() - started;
    expect(output).toBe(input);
    // Runs in a worker in the browser; this guards against accidental quadratic work.
    expect(elapsed).toBeLessThan(15_000);
  });
});
