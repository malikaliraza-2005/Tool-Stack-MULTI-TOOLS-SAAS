import { describe, expect, it } from "vitest";
import { explain } from "./explain";
import { compile, MAX_MATCHES, runRegex, type RegexJob } from "./logic";

function run(pattern: string, flags: string, text: string, replacement: string | null = null) {
  const result = runRegex({ pattern, flags, text, replacement } satisfies RegexJob);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe("matching", () => {
  it("equals native matchAll, including groups and positions", () => {
    const pattern = String.raw`(?<year>\d{4})-(\d{2})(?:-(?<day>\d{2}))?`;
    const text = "Dates: 2026-10-31, 1999-01 and 2000-02-29.";
    const result = run(pattern, "g", text);
    const native = [...text.matchAll(new RegExp(pattern, "gd"))];
    expect(result.total).toBe(native.length);
    result.matches.forEach((match, i) => {
      const expected = native[i]!;
      expect(match.text).toBe(expected[0]);
      expect(match.index).toBe(expected.index);
      expect(match.groups.map((g) => g.value)).toEqual(expected.slice(1).map((v) => v ?? null));
      expect(match.groups.map((g) => [g.start, g.end])).toEqual(
        expected.indices!.slice(1).map((pair) => (pair ? [pair[0], pair[1]] : [null, null])),
      );
    });
    expect(result.matches[0]!.groups.map((g) => g.name)).toEqual(["year", null, "day"]);
    // A group that didn't take part.
    expect(result.matches[1]!.groups[2]).toEqual({
      number: 3,
      name: "day",
      value: null,
      start: null,
      end: null,
    });
  });

  it("finds only the first match without g", () => {
    expect(run("o", "", "foo boo").matches.map((m) => m.index)).toEqual([1]);
    expect(run("o", "g", "foo boo").total).toBe(4);
  });

  it("applies flags", () => {
    expect(run("^b", "gm", "a\nb\nb").total).toBe(2);
    expect(run("A", "gi", "aAa").total).toBe(3);
    expect(run("a.b", "s", "a\nb").total).toBe(1);
    expect(run("\\p{Lu}", "gu", "Ärger Über").total).toBe(2);
  });

  it("handles zero-length matches", () => {
    expect(run("(?=o)", "g", "foo").matches.map((m) => m.index)).toEqual([1, 2]);
    expect(run("x*", "g", "ab").total).toBe(3);
  });

  it("caps the list but counts every match", () => {
    const result = run("a", "g", "a".repeat(MAX_MATCHES + 10));
    expect(result.matches).toHaveLength(MAX_MATCHES);
    expect(result).toMatchObject({ truncated: true, total: MAX_MATCHES + 10 });
  });

  it("explains invalid patterns and flag conflicts", () => {
    const bad = runRegex({ pattern: "(abc", flags: "g", text: "", replacement: null });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.message).toMatch(/^Invalid pattern: /);
    expect(!bad.ok && bad.message).not.toMatch(/Invalid regular expression/);
    const both = compile("a", "uv");
    expect("message" in both && both.message).toMatch(/u and v flags can’t be combined/);
  });
});

describe("replace", () => {
  it("previews replacements with numbered and named groups", () => {
    const text = "2026-10-31 and 1999-01-02";
    const pattern = String.raw`(?<y>\d{4})-(\d{2})-(\d{2})`;
    expect(run(pattern, "g", text, "$3/$2/$<y>").replaced).toBe("31/10/2026 and 02/01/1999");
    expect(run(pattern, "", text, "[$&]").replaced).toBe("[2026-10-31] and 1999-01-02");
    expect(run("a", "g", "aa", "$$").replaced).toBe("$$");
    expect(run("a", "g", "aa", null).replaced).toBeNull();
  });
});

describe("explain", () => {
  const descriptions = (pattern: string) =>
    explain(pattern).map((item) => [item.token, item.description]);

  it("explains common tokens", () => {
    expect(descriptions(String.raw`^\d{3}-[a-z]+$`)).toEqual([
      ["^", "Start of the text (or of a line, with the m flag)"],
      ["\\d", "A digit (0–9)"],
      ["{3}", "Exactly 3 times: repeats the previous item"],
      ["-", "Literal text “-”"],
      ["[a-z]", "Any one character of: a-z"],
      ["+", "One or more times (as many as possible): repeats the previous item"],
      ["$", "End of the text (or of a line, with the m flag)"],
    ]);
  });

  it("explains groups, lookarounds, alternation and laziness, with nesting", () => {
    const items = explain(String.raw`(?<word>\w+?)(?=!)|(?:cat|dog)s`);
    expect(items.map((item) => item.description)).toContain("Capturing group 1, named “word”");
    expect(items.find((item) => item.token === "+?")?.description).toBe(
      "One or more times (as few as possible): repeats the previous item",
    );
    expect(items.find((item) => item.token === "(?=")?.description).toMatch(/^Followed by/);
    expect(items.find((item) => item.token === "\\w")?.depth).toBe(1);
    expect(items.filter((item) => item.token === "|")).toHaveLength(2);
  });

  it("splits a literal run before a quantifier", () => {
    expect(descriptions("colou?r")).toEqual([
      ["colo", "Literal text “colo”"],
      ["u", "Literal text “u”"],
      ["?", "Optional: zero or one time (as many as possible): repeats the previous item"],
      ["r", "Literal text “r”"],
    ]);
  });

  it("marks unsupported syntax as not explained", () => {
    const items = explain("(?i:abc)");
    expect(items[0]).toMatchObject({
      known: false,
      description: "Not explained (an advanced group syntax)",
    });
  });
});
