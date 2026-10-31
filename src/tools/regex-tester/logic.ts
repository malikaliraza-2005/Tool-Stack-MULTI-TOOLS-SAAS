// Regex matching and replacing (tool-specifications §5.6). Runs only in a
// dedicated worker that the page kills after 1000 ms, because a pattern can
// backtrack catastrophically. No DOM, no React.

export const FLAGS = ["g", "i", "m", "s", "u", "v", "y", "d"] as const;
export type Flag = (typeof FLAGS)[number];

export type Group = {
  /** 1-based group number. */
  number: number;
  name: string | null;
  /** null when the group didn't take part in the match. */
  value: string | null;
  start: number | null;
  end: number | null;
};

export type Match = { index: number; end: number; text: string; groups: Group[] };

export type RegexJob = {
  pattern: string;
  flags: string;
  text: string;
  /** Replace mode: the replacement string ($1, $<name>, $&, $$). */
  replacement: string | null;
};

export type RegexJobResult =
  | {
      ok: true;
      matches: Match[];
      /** More matches exist than are listed. */
      truncated: boolean;
      total: number;
      replaced: string | null;
    }
  | { ok: false; message: string };

/** Matches listed (and highlighted) at most; the count still covers all of them. */
export const MAX_MATCHES = 5_000;

/** Builds the RegExp, or explains why the pattern is invalid. */
export function compile(pattern: string, flags: string): RegExp | { message: string } {
  if (flags.includes("u") && flags.includes("v")) {
    return {
      message: "The u and v flags can’t be combined. v is a newer, stricter form of u; choose one.",
    };
  }
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (flags.includes("v") && /flag/i.test(message)) {
      return { message: "This browser doesn’t support the v flag yet. Use u instead." };
    }
    // Engines prefix messages differently ("Invalid regular expression: /x/: …").
    return {
      message: `Invalid pattern: ${message.replace(/^Invalid regular expression:\s*\/.*\/[a-z]*:\s*/i, "")}`,
    };
  }
}

/** Group names by number, from the pattern's named groups (?<name>…). */
function groupNames(regex: RegExp, sample: RegExpMatchArray | null): (string | null)[] {
  const count = sample ? sample.length - 1 : 0;
  const names: (string | null)[] = Array.from({ length: count }, () => null);
  if (!sample?.groups) return names;
  // Named groups are numbered with the others, in order of their "(" in the
  // pattern; walk the pattern to find each capturing group's number.
  const source = regex.source;
  let number = 0;
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (inClass) {
      if (char === "]") inClass = false;
      continue;
    }
    if (char === "[") inClass = true;
    else if (char === "(") {
      if (source[i + 1] !== "?") number++;
      else {
        const named = /^\(\?<([A-Za-z_$][\w$]*)>/.exec(source.slice(i));
        if (named) names[number++] = named[1]!;
      }
    }
  }
  return names;
}

export function runRegex(job: RegexJob): RegexJobResult {
  const compiled = compile(job.pattern, job.flags);
  if (!(compiled instanceof RegExp)) return { ok: false, message: compiled.message };

  // Matching always uses `d` (group positions), which doesn't change results.
  const withIndices = new RegExp(
    compiled.source,
    compiled.flags.includes("d") ? compiled.flags : `${compiled.flags}d`,
  );
  const matches: Match[] = [];
  let total = 0;
  let names: (string | null)[] | null = null;
  // Without g, only the first match (as exec and match return it).
  const all = withIndices.global ? job.text.matchAll(withIndices) : first(withIndices, job.text);
  for (const match of all) {
    total++;
    if (matches.length >= MAX_MATCHES) continue;
    names ??= groupNames(withIndices, match);
    const indices = (match as RegExpMatchArray & { indices?: [number, number][] }).indices;
    matches.push({
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      text: match[0],
      groups: match.slice(1).map((value, i) => ({
        number: i + 1,
        name: names?.[i] ?? null,
        value: value ?? null,
        start: indices?.[i + 1]?.[0] ?? null,
        end: indices?.[i + 1]?.[1] ?? null,
      })),
    });
  }

  return {
    ok: true,
    matches,
    truncated: total > matches.length,
    total,
    replaced: job.replacement === null ? null : job.text.replace(compiled, job.replacement),
  };
}

function first(regex: RegExp, text: string): RegExpExecArray[] {
  const match = regex.exec(text);
  return match ? [match] : [];
}
