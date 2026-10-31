// Plain-language breakdown of a regex (tool-specifications §5.6, P1). Reads
// the pattern only (never runs it), so it is safe on the main thread. Common
// tokens are explained; anything else is listed as "not explained".

export type ExplainItem = {
  token: string;
  description: string;
  /** Nesting level inside groups. */
  depth: number;
  known: boolean;
};

const ESCAPES: Record<string, string> = {
  d: "A digit (0–9)",
  D: "Any character except a digit",
  w: "A word character (letter, digit or _)",
  W: "Any character except a word character",
  s: "A whitespace character (space, tab, line break…)",
  S: "Any character except whitespace",
  b: "A word boundary",
  B: "Not a word boundary",
  n: "A line feed (new line)",
  r: "A carriage return",
  t: "A tab",
  f: "A form feed",
  v: "A vertical tab",
  "0": "A NUL character",
};

const GROUPS: [RegExp, (m: RegExpExecArray, n: number) => string, boolean][] = [
  [/^\(\?:/, () => "Group (not captured)", false],
  [/^\(\?<([A-Za-z_$][\w$]*)>/, (m, n) => `Capturing group ${n}, named “${m[1]}”`, true],
  [
    /^\(\?=/,
    () => "Followed by (lookahead): the next part must match here, without consuming it",
    false,
  ],
  [/^\(\?!/, () => "Not followed by (negative lookahead)", false],
  [/^\(\?<=/, () => "Preceded by (lookbehind)", false],
  [/^\(\?<!/, () => "Not preceded by (negative lookbehind)", false],
];

function quantifier(text: string): string | null {
  const lazy = text.endsWith("?") && text.length > 1;
  const core = lazy ? text.slice(0, -1) : text;
  const greed = lazy ? "as few as possible" : "as many as possible";
  if (core === "*") return `Zero or more times (${greed})`;
  if (core === "+") return `One or more times (${greed})`;
  if (core === "?") return `Optional: zero or one time (${greed})`;
  const range = /^\{(\d+)(,(\d*))?\}$/.exec(core);
  if (!range) return null;
  const [, min, comma, max] = range;
  if (!comma) return `Exactly ${min} times`;
  return max ? `Between ${min} and ${max} times (${greed})` : `${min} or more times (${greed})`;
}

export function explain(pattern: string): ExplainItem[] {
  const items: ExplainItem[] = [];
  let depth = 0;
  let groupNumber = 0;
  let i = 0;
  const push = (token: string, description: string, known = true) =>
    items.push({ token, description, depth, known });
  const pushLiteral = (char: string) => {
    const last = items[items.length - 1];
    if (last && last.description.startsWith("Literal text") && last.depth === depth) {
      last.token += char;
      last.description = `Literal text “${unescapeLiteral(last.token)}”`;
    } else {
      push(char, `Literal text “${unescapeLiteral(char)}”`);
    }
  };

  while (i < pattern.length) {
    const rest = pattern.slice(i);
    const char = pattern[i]!;

    if (char === "\\") {
      const next = pattern[i + 1] ?? "";
      const unicode = /^\\[pP]\{([^}]*)\}/.exec(rest);
      const hex = /^\\x[0-9A-Fa-f]{2}|^\\u\{[0-9A-Fa-f]+\}|^\\u[0-9A-Fa-f]{4}/.exec(rest);
      const named = /^\\k<([^>]+)>/.exec(rest);
      const backref = /^\\([1-9]\d*)/.exec(rest);
      if (unicode) {
        push(
          unicode[0],
          `${next === "P" ? "Any character except one" : "A character"} with the Unicode property ${unicode[1]}`,
        );
        i += unicode[0].length;
      } else if (hex) {
        push(
          hex[0],
          `The character ${hex[0]
            .replace(/^\\[xu]\{?/, "U+")
            .replace(/\}$/, "")
            .toUpperCase()}`,
        );
        i += hex[0].length;
      } else if (named) {
        push(named[0], `The same text as group “${named[1]}” matched (backreference)`);
        i += named[0].length;
      } else if (backref) {
        push(backref[0], `The same text as group ${backref[1]} matched (backreference)`);
        i += backref[0].length;
      } else if (ESCAPES[next]) {
        push(`\\${next}`, ESCAPES[next]!);
        i += 2;
      } else if (next === "c" && /[A-Za-z]/.test(pattern[i + 2] ?? "")) {
        push(rest.slice(0, 3), `Control character Ctrl+${pattern[i + 2]!.toUpperCase()}`);
        i += 3;
      } else {
        pushLiteral(`\\${next}`);
        i += 2;
      }
      continue;
    }

    if (char === "[") {
      let end = i + 1;
      if (pattern[end] === "^") end++;
      if (pattern[end] === "]") end++;
      while (end < pattern.length && pattern[end] !== "]") end += pattern[end] === "\\" ? 2 : 1;
      const token = pattern.slice(i, end + 1);
      const negated = token.startsWith("[^");
      const body = token.slice(negated ? 2 : 1, -1);
      push(token, negated ? `Any one character except: ${body}` : `Any one character of: ${body}`);
      i = end + 1;
      continue;
    }

    if (char === "(") {
      const group = GROUPS.map(([regex, describe, capturing]) => {
        const m = regex.exec(rest);
        return m ? { m, describe, capturing } : null;
      }).find(Boolean);
      if (group) {
        if (group.capturing) groupNumber++;
        push(group.m[0], group.describe(group.m, groupNumber));
        i += group.m[0].length;
      } else if (rest.startsWith("(?")) {
        const token = /^\(\?[^)]*?[:)]/.exec(rest)?.[0] ?? "(?";
        push(token, "Not explained (an advanced group syntax)", false);
        i += token.length;
      } else {
        groupNumber++;
        push("(", `Capturing group ${groupNumber}`);
        i++;
      }
      depth++;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      push(")", "End of group");
      i++;
      continue;
    }

    const quant = /^(?:[*+?]|\{\d+(?:,\d*)?\})\??/.exec(rest);
    if (quant && items.length > 0) {
      // A quantifier repeats only the last character of a literal run.
      const last = items[items.length - 1]!;
      if (last.description.startsWith("Literal text") && last.token.length > 1) {
        const lastChar = /\\.$/.test(last.token) ? last.token.slice(-2) : last.token.slice(-1);
        last.token = last.token.slice(0, -lastChar.length);
        last.description = `Literal text “${unescapeLiteral(last.token)}”`;
        push(lastChar, `Literal text “${unescapeLiteral(lastChar)}”`);
      }
      push(quant[0], `${quantifier(quant[0])}: repeats the previous item`);
      i += quant[0].length;
      continue;
    }

    if (char === "|") push("|", "Or: the part before or the part after");
    else if (char === "^") push("^", "Start of the text (or of a line, with the m flag)");
    else if (char === "$") push("$", "End of the text (or of a line, with the m flag)");
    else if (char === ".")
      push(".", "Any character except a line break (any character with the s flag)");
    else pushLiteral(char);
    i++;
  }
  return items;
}

function unescapeLiteral(token: string): string {
  return token.replace(/\\(.)/g, "$1");
}
