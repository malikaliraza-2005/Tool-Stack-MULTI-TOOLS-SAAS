// ToolError taxonomy (tool-specifications §2.4). Every failure a user can see
// maps to one of these codes with a specific message: what happened and what
// to do next (content-voice-ux-copy §3). Messages never include file contents.

import { formatBytes } from "@/lib/files/format";

export const TOOL_ERROR_CODES = [
  "E_UNSUPPORTED_FORMAT",
  "E_TOO_LARGE",
  "E_CORRUPT",
  "E_ENCRYPTED",
  "E_OUT_OF_MEMORY",
  "E_TIMEOUT",
  "E_CANCELLED",
  "E_INVALID_INPUT",
  "E_UNKNOWN",
] as const;

export type ToolErrorCode = (typeof TOOL_ERROR_CODES)[number];

/** Where in a text input an error is (1-based line and column). */
export type TextLocation = { line: number; column: number; offset: number; length: number };

export type ToolErrorOptions = {
  /** Technical details for the "Details" toggle of E_UNKNOWN. */
  details?: string;
  /** For E_INVALID_INPUT on text. */
  location?: TextLocation;
  /** The file the error belongs to, for per-file errors. */
  fileName?: string;
  cause?: unknown;
};

export class ToolError extends Error {
  override readonly name = "ToolError";
  readonly code: ToolErrorCode;
  readonly details?: string;
  readonly location?: TextLocation;
  readonly fileName?: string;

  constructor(code: ToolErrorCode, message: string, options: ToolErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.code = code;
    this.details = options.details;
    this.location = options.location;
    this.fileName = options.fileName;
  }
}

export function isToolError(value: unknown): value is ToolError {
  return value instanceof ToolError;
}

/** Message builders, one per code (tool-specifications §2.4 message patterns). */
export const toolErrors = {
  unsupportedFormat: (p: { name: string; detected?: string; tool: string; formats: string }) =>
    new ToolError(
      "E_UNSUPPORTED_FORMAT",
      p.detected
        ? `${p.name} is ${p.detected}. ${p.tool} accepts ${p.formats}.`
        : `${p.name} isn’t a supported file. ${p.tool} accepts ${p.formats}.`,
      { fileName: p.name },
    ),

  tooLarge: (p: { name: string; size: number; limit: number; suggestion: string }) =>
    new ToolError(
      "E_TOO_LARGE",
      `${p.name} is ${formatBytes(p.size)}. The limit on this device is ${formatBytes(p.limit)}. Try ${p.suggestion}.`,
      { fileName: p.name },
    ),

  /** E_TOO_LARGE for tools whose limit applies to all files together (`limits.per: "total"`). */
  totalTooLarge: (p: { name: string; total: number; limit: number }) =>
    new ToolError(
      "E_TOO_LARGE",
      `Adding ${p.name} would bring the total to ${formatBytes(p.total)}. The limit on this device is ${formatBytes(p.limit)}. Try fewer or smaller files.`,
      { fileName: p.name },
    ),

  corrupt: (name: string, cause?: unknown) =>
    new ToolError("E_CORRUPT", `${name} couldn’t be read. It may be damaged or incomplete.`, {
      fileName: name,
      cause,
    }),

  encrypted: (name: string) =>
    new ToolError(
      "E_ENCRYPTED",
      `${name} is password-protected. Remove the password first, then try again.`,
      { fileName: name },
    ),

  outOfMemory: (cause?: unknown) =>
    new ToolError(
      "E_OUT_OF_MEMORY",
      "Your browser ran out of memory. Try fewer or smaller files, or a desktop browser.",
      { cause },
    ),

  timeout: (message: string) => new ToolError("E_TIMEOUT", message),

  cancelled: () => new ToolError("E_CANCELLED", "Cancelled."),

  invalidInput: (message: string, location?: TextLocation) =>
    new ToolError(
      "E_INVALID_INPUT",
      location ? `Line ${location.line}, column ${location.column}: ${message}` : message,
      { location },
    ),

  unknown: (action: string, details?: string, cause?: unknown) =>
    new ToolError(
      "E_UNKNOWN",
      `Something unexpected happened while ${action}. Nothing was uploaded. Try again.`,
      { details, cause },
    ),
};

/** True for the errors browsers throw when an allocation fails. */
export function isOutOfMemory(error: unknown): boolean {
  if (error instanceof RangeError) {
    return /allocat|out of memory|array buffer|invalid array length|invalid string length/i.test(
      error.message,
    );
  }
  return (
    error instanceof Error &&
    (error.name === "NotReadableError" || /out of memory/i.test(error.message))
  );
}

/**
 * Maps anything thrown into a ToolError. `action` completes the E_UNKNOWN
 * sentence: "Something unexpected happened while {action}."
 */
export function toToolError(error: unknown, action: string): ToolError {
  if (isToolError(error)) return error;
  if (error instanceof DOMException && error.name === "AbortError") return toolErrors.cancelled();
  if (isOutOfMemory(error)) return toolErrors.outOfMemory(error);
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return toolErrors.unknown(action, details, error);
}

/** Plain-object form for postMessage (class identity does not survive cloning). */
export type SerializedToolError = {
  code: ToolErrorCode;
  message: string;
  details?: string;
  location?: TextLocation;
  fileName?: string;
};

export function serializeToolError(error: ToolError): SerializedToolError {
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    location: error.location,
    fileName: error.fileName,
  };
}

export function deserializeToolError(error: SerializedToolError): ToolError {
  return new ToolError(error.code, error.message, {
    details: error.details,
    location: error.location,
    fileName: error.fileName,
  });
}
