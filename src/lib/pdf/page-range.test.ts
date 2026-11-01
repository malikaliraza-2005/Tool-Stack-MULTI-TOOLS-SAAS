import { describe, expect, it } from "vitest";
import { formatPageList, parsePageRange } from "./page-range";

function pages(text: string, count = 10) {
  const result = parsePageRange(text, count);
  if (!result.ok) throw new Error(`unexpected error: ${result.message}`);
  return result.pages;
}

function failure(text: string, count = 10) {
  const result = parsePageRange(text, count);
  if (result.ok) throw new Error("expected an error");
  return result;
}

describe("parsePageRange", () => {
  it("parses pages, ranges and open-ended ranges", () => {
    expect(pages("1-3, 5, 8-")).toEqual([1, 2, 3, 5, 8, 9, 10]);
    expect(pages("7")).toEqual([7]);
    expect(pages("-3")).toEqual([1, 2, 3]);
    expect(pages("10-")).toEqual([10]);
    expect(pages("1-10")).toHaveLength(10);
  });

  it("tolerates whitespace and empty parts", () => {
    expect(pages("  1 - 3 ,5 ,, 8 -  ")).toEqual([1, 2, 3, 5, 8, 9, 10]);
    expect(pages("2,")).toEqual([2]);
  });

  it("keeps the order given and removes duplicates", () => {
    expect(pages("5, 1-3, 2, 5")).toEqual([5, 1, 2, 3]);
    expect(pages("3-4, 1-4")).toEqual([3, 4, 1, 2]);
  });

  it("rejects reversed ranges", () => {
    expect(failure("1, 5-3")).toMatchObject({
      token: "5-3",
      offset: 3,
      message: "“5-3” goes backwards. Write the lower page first, for example 3-5.",
    });
  });

  it("rejects pages beyond the document, naming the token", () => {
    expect(failure("1-3, 12")).toMatchObject({
      token: "12",
      offset: 5,
      message: "“12”: 12 is beyond the last page (10).",
    });
    expect(failure("8-11").message).toBe("“8-11”: 11 is beyond the last page (10).");
    expect(failure("0").message).toBe("“0”: pages are numbered from 1.");
  });

  it("rejects text that isn't a page or range", () => {
    for (const text of ["a", "1-2-3", "1.5", "first", "1 2", "-"]) {
      expect(failure(text).message, text).toMatch(/isn’t a page or a range/);
    }
  });

  it("asks for pages when the input is empty", () => {
    expect(failure("").message).toBe("Enter the pages, for example 1-3, 5.");
    expect(failure(" , ").message).toBe("Enter the pages, for example 1-3, 5.");
  });
});

describe("formatPageList", () => {
  it("joins consecutive pages into ranges", () => {
    expect(formatPageList([1, 2, 3, 5, 8, 9, 10])).toBe("1-3, 5, 8-10");
    expect(formatPageList([5, 1, 2])).toBe("5, 1-2");
    expect(formatPageList([])).toBe("");
  });
});
