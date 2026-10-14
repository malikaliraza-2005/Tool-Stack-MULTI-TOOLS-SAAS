// JSON Formatter logic (tool-specifications §5.1). Pure functions, no DOM.
//
// Text is parsed with jsonc-parser (exact error offsets, optional JSONC) and
// re-serialized from the syntax tree. Number and string literals are copied
// from the source text, so formatting never changes a value: big integers keep
// every digit, and escapes stay as written.

import {
  parseTree,
  type Node as JsoncNode,
  type ParseError,
  type ParseOptions,
} from "jsonc-parser";

// jsonc-parser's ParseErrorCode is a `const enum`, which isolatedModules can't
// read across packages; these are its values.
const ParseErrorCode = {
  InvalidSymbol: 1,
  InvalidNumberFormat: 2,
  PropertyNameExpected: 3,
  ValueExpected: 4,
  ColonExpected: 5,
  CommaExpected: 6,
  CloseBraceExpected: 7,
  CloseBracketExpected: 8,
  EndOfFileExpected: 9,
  InvalidCommentToken: 10,
  UnexpectedEndOfComment: 11,
  UnexpectedEndOfString: 12,
  UnexpectedEndOfNumber: 13,
  InvalidUnicode: 14,
  InvalidEscapeCharacter: 15,
  InvalidCharacter: 16,
} as const;

export type JsonIndent = "2" | "4" | "tab";
export type JsonMode = "format" | "minify" | "tree";

export type JsonOptions = {
  indent: JsonIndent;
  sortKeys: boolean;
  /** Accept comments and trailing commas (JSONC). Off = strict JSON. */
  allowJsonc: boolean;
};

export const DEFAULT_OPTIONS: JsonOptions = { indent: "2", sortKeys: false, allowJsonc: false };

/** A located syntax error. Line and column are 1-based; column counts UTF-16 code units. */
export type JsonError = {
  message: string;
  line: number;
  column: number;
  offset: number;
  length: number;
};

export type BigNumbers = {
  count: number;
  /** Up to MAX_BIG_NUMBER_EXAMPLES occurrences, in document order. */
  examples: { path: string; raw: string }[];
};

export type OutputStats = { lines: number; bytes: number };

export type FormatResult =
  | { ok: true; output: string; stats: OutputStats; bigNumbers: BigNumbers | null }
  | { ok: false; error: JsonError };

export type TreeNodeType = "object" | "array" | "string" | "number" | "boolean" | "null";

/** Compact tree for the tree view; plain data, so it can cross a worker boundary. */
export type TreeNode = {
  type: TreeNodeType;
  /** Property name, or index in the parent array. Absent on the root. */
  key?: string | number;
  /** Source text of a scalar (strings keep their quotes and escapes). */
  raw?: string;
  children?: TreeNode[];
};

export type TreeResult =
  | { ok: true; root: TreeNode; nodes: number; bigNumbers: BigNumbers | null }
  | { ok: false; error: JsonError };

/** Above this many levels the recursive parser and serializer would exhaust the stack. */
export const MAX_DEPTH = 2000;
export const MAX_BIG_NUMBER_EXAMPLES = 5;
const MAX_SAFE = String(Number.MAX_SAFE_INTEGER);

// ---------------------------------------------------------------------------
// Locations and error messages

/** 1-based line and column of a UTF-16 offset. */
export function locate(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: end - lineStart + 1 };
}

function previousSignificant(text: string, offset: number): { char: string; offset: number } {
  for (let i = offset - 1; i >= 0; i--) {
    const char = text[i]!; // i is within the string
    if (!/\s/.test(char)) return { char, offset: i };
  }
  return { char: "", offset: -1 };
}

const quote = (s: string) => `“${s}”`;

function describe(error: ParseError, text: string, jsonc: boolean): JsonError {
  let { offset, length } = error;
  const token = text.slice(offset, offset + Math.max(length, 1));
  const atEnd = offset >= text.trimEnd().length;
  let message: string;

  switch (error.error as number) {
    case ParseErrorCode.InvalidSymbol:
      if (token.startsWith("'")) message = 'Strings and property names need double quotes (").';
      else if (/^[A-Za-z_$]/.test(token)) {
        message = `Unexpected ${quote(text.slice(offset, offset + length))}. Property names need double quotes, and values must be a string, number, object, array, true, false or null.`;
      } else message = `Unexpected character ${quote(token[0] ?? "")}.`;
      break;
    case ParseErrorCode.InvalidNumberFormat:
    case ParseErrorCode.UnexpectedEndOfNumber:
      message = `${quote(text.slice(offset, offset + length))} is not a valid number.`;
      break;
    case ParseErrorCode.PropertyNameExpected:
    case ParseErrorCode.ValueExpected: {
      const previous = previousSignificant(text, offset);
      if (previous.char === "," && (token === "}" || token === "]")) {
        message = jsonc
          ? "A comma must be followed by a value."
          : "Trailing comma. Remove it, or turn on Allow comments to accept trailing commas.";
        offset = previous.offset;
        length = 1;
      } else if (atEnd) {
        message = "Unexpected end of input. A value is missing.";
      } else if (error.error === ParseErrorCode.PropertyNameExpected) {
        message = "Expected a property name in double quotes.";
      } else {
        message = "Expected a value: a string, number, object, array, true, false or null.";
      }
      break;
    }
    case ParseErrorCode.ColonExpected:
      message = "Expected “:” after the property name.";
      break;
    case ParseErrorCode.CommaExpected: {
      // "01": the scanner reads "0", then reports the "1" as a missing comma.
      const zero = offset - 1;
      if (/^\d/.test(token) && text[zero] === "0" && !/[\d.eE]/.test(text[zero - 1] ?? "")) {
        message = "Numbers can’t start with a leading zero.";
        offset = zero;
        length = 1;
      } else {
        // A missing comma at the end of a line is reported at the next line's
        // value; point at the end of the value that needs the comma instead.
        const previous = previousSignificant(text, offset);
        const lineBreak = text.slice(previous.offset, offset).includes(String.fromCharCode(10));
        if (previous.offset >= 0 && lineBreak) {
          offset = previous.offset + 1;
          length = 0;
          message = "Expected “,” after this value. Check for a missing comma.";
        } else message = "Expected “,” between values. Check for a missing comma.";
      }
      break;
    }
    case ParseErrorCode.CloseBraceExpected:
      message = atEnd
        ? "Unexpected end of input. An object is missing its closing “}”."
        : "Expected “,” or “}” after a property.";
      break;
    case ParseErrorCode.CloseBracketExpected:
      message = atEnd
        ? "Unexpected end of input. An array is missing its closing “]”."
        : "Expected “,” or “]” after a value.";
      break;
    case ParseErrorCode.EndOfFileExpected:
      message = "Unexpected text after the end of the JSON. Only one top-level value is allowed.";
      break;
    case ParseErrorCode.InvalidCommentToken:
      message = "Comments aren’t allowed in strict JSON. Turn on Allow comments to accept them.";
      break;
    case ParseErrorCode.UnexpectedEndOfComment:
      message = "Unterminated comment. Close it with “*/”.";
      break;
    case ParseErrorCode.UnexpectedEndOfString:
      message =
        "Unterminated string. Check for a missing closing quote or a line break inside the string.";
      break;
    case ParseErrorCode.InvalidUnicode:
      message = "Invalid unicode escape. Use \\u followed by four hex digits.";
      break;
    case ParseErrorCode.InvalidEscapeCharacter:
      message =
        'Invalid escape sequence. Valid escapes are \\" \\\\ \\/ \\b \\f \\n \\r \\t \\uXXXX.';
      break;
    case ParseErrorCode.InvalidCharacter:
      message = "Control characters (such as tabs or line breaks) must be escaped inside strings.";
      break;
    default:
      message = "Invalid JSON.";
  }
  return { message, ...locate(text, offset), offset, length };
}

/** Error position from a native JSON.parse message ("…at position 12…"). */
function describeNative(error: unknown, text: string): JsonError {
  const raw = error instanceof Error ? error.message : String(error);
  const position = /position (\d+)/.exec(raw);
  const offset = position ? Number(position[1]) : 0;
  const message = raw.replace(/\s*in JSON at position \d+.*$/, "").replace(/\s*\(line.*$/, "");
  return { message: `${message}.`, ...locate(text, offset), offset, length: 1 };
}

// ---------------------------------------------------------------------------
// Parsing

export type ParseOutcome = { ok: true; root: JsoncNode } | { ok: false; error: JsonError };

/** A leading byte order mark becomes a space, so offsets still match the input. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? ` ${text.slice(1)}` : text;
}

function depthError(text: string): JsonError {
  return {
    message: `This JSON is nested more than ${MAX_DEPTH} levels deep, which this tool doesn’t support.`,
    ...locate(text, 0),
    offset: 0,
    length: 0,
  };
}

/** Rejects absurd nesting before the recursive parser can overflow the stack. */
function exceedsDepth(text: string): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 92)
        i++; // backslash: skip the escaped character
      else if (c === 34) inString = false;
    } else if (c === 34) inString = true;
    else if (c === 123 || c === 91) {
      if (++depth > MAX_DEPTH) return true;
    } else if (c === 125 || c === 93) depth--;
  }
  return false;
}

export function parseJson(input: string, allowJsonc: boolean): ParseOutcome {
  const text = stripBom(input);
  if (exceedsDepth(text)) return { ok: false, error: depthError(text) };
  const errors: ParseError[] = [];
  const options: ParseOptions = {
    disallowComments: !allowJsonc,
    allowTrailingComma: allowJsonc,
    allowEmptyContent: false,
  };
  const root = parseTree(text, errors, options);
  const first = errors.reduce<ParseError | undefined>(
    (earliest, e) => (!earliest || e.offset < earliest.offset ? e : earliest),
    undefined,
  );
  if (first) return { ok: false, error: describe(first, text, allowJsonc) };
  if (!root)
    return {
      ok: false,
      error: describe(
        { error: ParseErrorCode.ValueExpected as ParseError["error"], offset: 0, length: 0 },
        text,
        allowJsonc,
      ),
    };
  // Safety net: strict mode must agree with the platform's JSON parser.
  if (!allowJsonc) {
    try {
      JSON.parse(text);
    } catch (error) {
      return { ok: false, error: describeNative(error, text) };
    }
  }
  return { ok: true, root };
}

// ---------------------------------------------------------------------------
// Paths and big numbers

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** `["users", 3, "email"]` → `$.users[3].email`; other keys use bracket notation. */
export function jsonPath(segments: readonly (string | number)[]): string {
  let path = "$";
  for (const segment of segments) {
    if (typeof segment === "number") path += `[${segment}]`;
    else if (IDENTIFIER.test(segment)) path += `.${segment}`;
    else path += `[${JSON.stringify(segment)}]`;
  }
  return path;
}

/** Integer literals beyond Number.MAX_SAFE_INTEGER lose precision in JavaScript. */
export function isUnsafeInteger(raw: string): boolean {
  if (!/^-?\d+$/.test(raw)) return false;
  const digits = raw.replace(/^-/, "").replace(/^0+(?=\d)/, "");
  if (digits.length !== MAX_SAFE.length) return digits.length > MAX_SAFE.length;
  return digits > MAX_SAFE;
}

class BigNumberCollector {
  count = 0;
  examples: { path: string; raw: string }[] = [];
  check(raw: string, path: () => string) {
    if (!isUnsafeInteger(raw)) return;
    this.count++;
    if (this.examples.length < MAX_BIG_NUMBER_EXAMPLES) this.examples.push({ path: path(), raw });
  }
  result(): BigNumbers | null {
    return this.count === 0 ? null : { count: this.count, examples: this.examples };
  }
}

// ---------------------------------------------------------------------------
// Serializing

const keyOf = (property: JsoncNode): string => String(property.children?.[0]?.value ?? "");

function orderedProperties(node: JsoncNode, sortKeys: boolean): JsoncNode[] {
  const properties = node.children ?? [];
  if (!sortKeys) return properties;
  // Code-unit order; stable, so duplicate keys keep their order.
  return [...properties].sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

const sourceOf = (text: string, node: JsoncNode) =>
  text.slice(node.offset, node.offset + node.length);

function serialize(
  root: JsoncNode,
  text: string,
  indentUnit: string | null,
  sortKeys: boolean,
  bigNumbers: BigNumberCollector,
): string {
  const out: string[] = [];
  const path: (string | number)[] = [];
  const indents = [""];
  const indentAt = (depth: number) => {
    while (indents.length <= depth) indents.push(indents[indents.length - 1] + (indentUnit ?? ""));
    return indents[depth]!; // filled above
  };
  const separator = indentUnit === null ? ":" : ": ";

  const write = (node: JsoncNode, depth: number): void => {
    switch (node.type) {
      case "object": {
        const properties = orderedProperties(node, sortKeys);
        if (properties.length === 0) {
          out.push("{}");
          return;
        }
        out.push("{");
        properties.forEach((property, i) => {
          if (i > 0) out.push(",");
          if (indentUnit !== null) out.push("\n", indentAt(depth + 1));
          const [keyNode, valueNode] = property.children ?? [];
          if (!keyNode || !valueNode) return; // only in invalid input, which never gets here
          out.push(sourceOf(text, keyNode), separator);
          path.push(String(keyNode.value));
          write(valueNode, depth + 1);
          path.pop();
        });
        if (indentUnit !== null) out.push("\n", indentAt(depth));
        out.push("}");
        return;
      }
      case "array": {
        const items = node.children ?? [];
        if (items.length === 0) {
          out.push("[]");
          return;
        }
        out.push("[");
        items.forEach((item, i) => {
          if (i > 0) out.push(",");
          if (indentUnit !== null) out.push("\n", indentAt(depth + 1));
          path.push(i);
          write(item, depth + 1);
          path.pop();
        });
        if (indentUnit !== null) out.push("\n", indentAt(depth));
        out.push("]");
        return;
      }
      case "number": {
        const raw = sourceOf(text, node);
        bigNumbers.check(raw, () => jsonPath(path));
        out.push(raw);
        return;
      }
      default:
        out.push(sourceOf(text, node));
    }
  };

  write(root, 0);
  return out.join("");
}

/** Line count and UTF-8 size of the output. */
export function measure(output: string): OutputStats {
  let lines = output.length === 0 ? 0 : 1;
  let bytes = 0;
  for (let i = 0; i < output.length; i++) {
    const c = output.charCodeAt(i);
    if (c === 10) lines++;
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      bytes += 4; // surrogate pair: one 4-byte character
      i++;
    } else bytes += 3;
  }
  return { lines, bytes };
}

function indentUnitOf(indent: JsonIndent): string {
  return indent === "tab" ? "\t" : " ".repeat(Number(indent));
}

/** Formats (pretty-prints) or minifies JSON. Output is always strict JSON. */
export function formatJson(
  text: string,
  options: JsonOptions,
  mode: "format" | "minify",
): FormatResult {
  const parsed = parseJson(text, options.allowJsonc);
  if (!parsed.ok) return parsed;
  const bigNumbers = new BigNumberCollector();
  const output = serialize(
    parsed.root,
    stripBom(text),
    mode === "minify" ? null : indentUnitOf(options.indent),
    options.sortKeys,
    bigNumbers,
  );
  return { ok: true, output, stats: measure(output), bigNumbers: bigNumbers.result() };
}

// ---------------------------------------------------------------------------
// Tree view

export function buildTree(text: string, options: JsonOptions): TreeResult {
  const parsed = parseJson(text, options.allowJsonc);
  if (!parsed.ok) return parsed;
  const source = stripBom(text);
  const bigNumbers = new BigNumberCollector();
  const path: (string | number)[] = [];
  let nodes = 0;

  const convert = (node: JsoncNode, key?: string | number): TreeNode => {
    nodes++;
    const base = key === undefined ? {} : { key };
    if (node.type === "object") {
      const children: TreeNode[] = [];
      for (const property of orderedProperties(node, options.sortKeys)) {
        const [keyNode, valueNode] = property.children ?? [];
        if (!keyNode || !valueNode) continue;
        const name = String(keyNode.value);
        path.push(name);
        children.push(convert(valueNode, name));
        path.pop();
      }
      return { ...base, type: "object", children };
    }
    if (node.type === "array") {
      const children = (node.children ?? []).map((item, index) => {
        path.push(index);
        const child = convert(item, index);
        path.pop();
        return child;
      });
      return { ...base, type: "array", children };
    }
    const raw = sourceOf(source, node);
    if (node.type === "number") bigNumbers.check(raw, () => jsonPath(path));
    return { ...base, type: node.type as TreeNodeType, raw };
  };

  const root = convert(parsed.root);
  return { ok: true, root, nodes, bigNumbers: bigNumbers.result() };
}

// ---------------------------------------------------------------------------
// Worker protocol (logic.worker.ts)

export type JsonJob =
  | { op: "format" | "minify"; text: string; options: JsonOptions }
  | { op: "tree"; text: string; options: JsonOptions };

export type JsonJobResult = FormatResult | TreeResult;

export function runJob(job: JsonJob): JsonJobResult {
  return job.op === "tree"
    ? buildTree(job.text, job.options)
    : formatJson(job.text, job.options, job.op);
}

export { SAMPLE_JSON, WORKER_THRESHOLD } from "./constants";
