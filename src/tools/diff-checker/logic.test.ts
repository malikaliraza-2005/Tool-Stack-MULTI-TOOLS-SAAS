import { applyPatch, parsePatch } from "diff";
import { describe, expect, it } from "vitest";
import { compare, splitLines, type DiffOptions, type Row } from "./logic";

const LINE: DiffOptions = { granularity: "line", ignoreWhitespace: false, ignoreCase: false };
const WORD: DiffOptions = { ...LINE, granularity: "word" };
const CHAR: DiffOptions = { ...LINE, granularity: "char" };

function diff(original: string, changed: string, options = LINE) {
  const result = compare({ original, changed, options });
  if (!result.ok) throw new Error(result.message);
  return result.result;
}

/** Compact form of rows: "= 1 1 text", "- 2 . text", "+ . 2 text", "~ 3 3 old → new". */
function summary(rows: Row[]): string[] {
  const text = (segments: Row["left"]) => segments?.map((s) => s.text).join("") ?? "";
  return rows.map((row) => {
    const numbers = `${row.leftNo ?? "."} ${row.rightNo ?? "."}`;
    switch (row.kind) {
      case "equal":
        return `= ${numbers} ${text(row.left)}`;
      case "removed":
        return `- ${numbers} ${text(row.left)}`;
      case "added":
        return `+ ${numbers} ${text(row.right)}`;
      default:
        return `~ ${numbers} ${text(row.left)} → ${text(row.right)}`;
    }
  });
}

describe("splitLines", () => {
  it("handles LF, CRLF and a missing final newline", () => {
    expect(splitLines("")).toEqual({ lines: [], endsWithNewline: false });
    expect(splitLines("a\r\nb\n")).toEqual({ lines: ["a", "b"], endsWithNewline: true });
    expect(splitLines("a\n\nb")).toEqual({ lines: ["a", "", "b"], endsWithNewline: false });
  });
});

describe("compare", () => {
  it("produces the expected rows and counts for a fixture pair", () => {
    const result = diff(
      "apple\nbanana\ncherry\ndate\n",
      "apple\nblueberry\ncherry\nelderberry\nfig\n",
    );
    expect(summary(result.rows)).toEqual([
      "= 1 1 apple",
      "~ 2 2 banana → blueberry",
      "= 3 3 cherry",
      "~ 4 4 date → elderberry",
      "+ . 5 fig",
    ]);
    expect(result).toMatchObject({ added: 3, removed: 2, identical: false, changeStarts: [1, 3] });
  });

  it("marks pure additions and removals", () => {
    expect(summary(diff("a\nb\nc", "a\nc").rows)).toEqual(["= 1 1 a", "- 2 . b", "= 3 2 c"]);
    expect(summary(diff("", "x\ny").rows)).toEqual(["+ . 1 x", "+ . 2 y"]);
    expect(diff("same\n", "same\n").identical).toBe(true);
  });

  it("highlights the changed words or characters within a line", () => {
    const words = diff("the quick brown fox", "the slow brown fox", WORD).rows[0]!;
    expect(words.left).toEqual([
      { text: "the ", changed: false },
      { text: "quick", changed: true },
      { text: " brown fox", changed: false },
    ]);
    expect(words.right?.find((s) => s.changed)?.text).toBe("slow");
    const chars = diff("colour", "color", CHAR).rows[0]!;
    expect(chars.left).toEqual([
      { text: "colo", changed: false },
      { text: "u", changed: true },
      { text: "r", changed: false },
    ]);
    expect(diff("abc", "abd", LINE).rows[0]!.left).toEqual([{ text: "abc", changed: true }]);
  });

  it("ignores whitespace and case when asked", () => {
    const original = "Hello  World\n\tindented\nsame\n";
    const changed = "hello world\nindented   \nsame\n";
    expect(diff(original, changed).added).toBe(2);
    expect(diff(original, changed, { ...LINE, ignoreWhitespace: true }).added).toBe(1);
    expect(diff(original, changed, { ...LINE, ignoreCase: true }).added).toBe(2);
    const both = diff(original, changed, { ...LINE, ignoreWhitespace: true, ignoreCase: true });
    expect(both.identical).toBe(true);
    // Each side still shows its own text.
    expect(summary(both.rows)[0]).toBe("= 1 1 Hello  World");
    expect(both.rows[0]!.right?.[0]?.text).toBe("hello world");
  });

  it("keeps the original's case on the left with ignoreCase", () => {
    const row = diff("Hello World", "hello there", { ...WORD, ignoreCase: true }).rows[0]!;
    expect(row.left?.map((s) => s.text).join("")).toBe("Hello World");
    expect(row.left?.[0]).toEqual({ text: "Hello ", changed: false });
  });
});

describe("unified diff", () => {
  const cases: [string, string, string][] = [
    ["fixture", "apple\nbanana\ncherry\ndate\n", "apple\nblueberry\ncherry\nelderberry\nfig\n"],
    ["far apart", Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n") + "\n", ""],
    ["no final newline", "a\nb\nc", "a\nB\nc"],
    ["added final newline", "a\nb", "a\nb\nc\n"],
    ["from empty", "", "new\nfile\n"],
    ["to empty", "old\n", ""],
  ];
  cases[1]![2] = cases[1]![1].replace("line 2\n", "line 2 changed\n").replace("line 25\n", "");

  it.each(cases)("%s: parses and applies like patch", (_, original, changed) => {
    const result = diff(original, changed);
    const patches = parsePatch(result.unified);
    expect(patches).toHaveLength(1);
    expect(applyPatch(original, patches[0]!)).toBe(changed);
  });

  it("writes standard headers and hunk ranges", () => {
    const { unified } = diff("apple\nbanana\ncherry\n", "apple\nblueberry\ncherry\n");
    expect(unified).toBe(
      "--- original\n+++ changed\n@@ -1,3 +1,3 @@\n apple\n-banana\n+blueberry\n cherry\n",
    );
    expect(diff("same", "same").unified).toBe("");
  });

  it("splits distant changes into separate hunks", () => {
    const original = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n") + "\n";
    const changed = original.replace("line 2\n", "line two\n").replace("line 25\n", "line 25!\n");
    expect(diff(original, changed).unified.match(/^@@/gm)).toHaveLength(2);
  });
});

describe("performance", () => {
  it("compares 50,000-line inputs quickly", () => {
    const original = Array.from(
      { length: 50_000 },
      (_, i) => `Line ${i}: some ordinary text\n`,
    ).join("");
    const changed = original
      .replace("Line 100: some", "Line 100: changed")
      .replace("Line 25000: some ordinary text\n", "")
      .concat("A new last line\n");
    const started = performance.now();
    const result = diff(original, changed, WORD);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(result).toMatchObject({ added: 2, removed: 2 });
    expect(result.rows).toHaveLength(50_001);
  });
});
