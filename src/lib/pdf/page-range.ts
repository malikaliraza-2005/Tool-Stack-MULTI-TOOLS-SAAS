// Page-range parser (tool-specifications §3.2), shared by split-pdf and
// pdf-to-jpg. Syntax: comma-separated pages and ranges, 1-based, whitespace
// tolerant: "1-3, 5, 8-" (open-ended). Pure: no DOM.

export type PageRangeResult =
  | {
      ok: true;
      /** 1-based page numbers in the order given, without duplicates. */
      pages: number[];
    }
  | {
      ok: false;
      message: string;
      /** The offending part as typed, and where it starts in the input. */
      token: string;
      offset: number;
    };

const PART = /^(\d+)?\s*(-)?\s*(\d+)?$/;

/** Parses `text` for a document with `pageCount` pages. */
export function parsePageRange(text: string, pageCount: number): PageRangeResult {
  const pages: number[] = [];
  const seen = new Set<number>();
  const add = (page: number) => {
    if (!seen.has(page)) {
      seen.add(page);
      pages.push(page);
    }
  };

  if (text.trim() === "") {
    return { ok: false, message: "Enter the pages, for example 1-3, 5.", token: "", offset: 0 };
  }

  let offset = 0;
  for (const raw of text.split(",")) {
    const start = offset + (raw.length - raw.trimStart().length);
    offset += raw.length + 1;
    const token = raw.trim();
    const fail = (message: string): PageRangeResult => ({
      ok: false,
      message,
      token,
      offset: start,
    });

    if (token === "") {
      // "1,,2" or a trailing comma: harmless, skip it.
      continue;
    }
    const match = PART.exec(token);
    // Valid: "5", "1-3", "8-", "-3". Two numbers need a dash between them.
    if (!match || (!match[1] && !match[3]) || (match[1] && match[3] && !match[2])) {
      return fail(
        `“${token}” isn’t a page or a range. Use numbers like 5, ranges like 1-3, or 8- for page 8 to the end.`,
      );
    }
    const [, first, dash, last] = match;
    const from = first ? Number(first) : 1;
    const to = dash ? (last ? Number(last) : pageCount) : from;
    for (const value of [from, to]) {
      if (value === 0) return fail(`“${token}”: pages are numbered from 1.`);
      if (value > pageCount) {
        return fail(
          `“${token}”: ${value} is beyond the last page (${pageCount.toLocaleString("en-US")}).`,
        );
      }
    }
    if (from > to) {
      return fail(
        `“${token}” goes backwards. Write the lower page first, for example ${to}-${from}.`,
      );
    }
    for (let page = from; page <= to; page++) add(page);
  }

  if (pages.length === 0) {
    return { ok: false, message: "Enter the pages, for example 1-3, 5.", token: "", offset: 0 };
  }
  return { ok: true, pages };
}

/** "1-3, 5, 8-10": a compact label for a list of 1-based pages, in order. */
export function formatPageList(pages: readonly number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    let end = i;
    while (end + 1 < pages.length && pages[end + 1] === pages[end]! + 1) end++;
    parts.push(end > i ? `${pages[i]}-${pages[end]}` : `${pages[i]}`);
    i = end;
  }
  return parts.join(", ");
}
