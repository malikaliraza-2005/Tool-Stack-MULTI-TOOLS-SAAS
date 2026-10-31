// JWT decoding (tool-specifications §5.2). Pure functions, no library:
// decoding needs only base64url and JSON. Verification (verify.ts) loads jose
// on demand.

/** Where in the input a problem is (1-based line and column). */
export type InputError = { message: string; line: number; column: number; offset: number };

export type TimeStatus = "valid" | "expired" | "not-yet-valid" | "no-expiry";

export type Claim = {
  name: string;
  /** JSON text of the value. */
  value: string;
  /** What a registered claim means, e.g. "Expires". */
  description: string | null;
  /** Unix milliseconds for exp, iat and nbf. */
  timeMs: number | null;
};

export type DecodedJwt = {
  /** The token as verified: trimmed, without "Bearer " and whitespace. */
  token: string;
  header: Record<string, unknown>;
  /** Parsed payload; null when it isn't JSON (then `payloadText` holds it). */
  payload: Record<string, unknown> | null;
  payloadText: string;
  headerJson: string;
  payloadJson: string;
  alg: string | null;
  claims: Claim[];
  status: TimeStatus;
  /** Unix milliseconds of exp / nbf when present. */
  expiresMs: number | null;
  notBeforeMs: number | null;
  /** `alg: none`: anyone can forge the token. */
  unsecured: boolean;
  signatureLength: number;
};

export type DecodeResult = { ok: true; jwt: DecodedJwt } | { ok: false; error: InputError };

const REGISTERED: Record<string, string> = {
  iss: "Issuer",
  sub: "Subject",
  aud: "Audience",
  exp: "Expires",
  nbf: "Not before",
  iat: "Issued at",
  jti: "Token ID",
};
const TIME_CLAIMS = new Set(["exp", "nbf", "iat"]);

/** 1-based line and column of `offset` in `text`. */
function locate(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

const BASE64URL = /^[A-Za-z0-9_-]*$/;

/** Decodes base64url (padding tolerated) to bytes; the index of a bad character on failure. */
function base64UrlToBytes(segment: string): Uint8Array | { badIndex: number } {
  const body = segment.replace(/=+$/, "");
  if (!BASE64URL.test(body)) {
    return { badIndex: body.search(/[^A-Za-z0-9_-]/) };
  }
  if (body.length % 4 === 1) return { badIndex: body.length - 1 };
  const binary = atob(
    body
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(body.length / 4) * 4, "="),
  );
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const utf8 = new TextDecoder("utf-8", { fatal: true });

export function decodeJwt(text: string, now: number): DecodeResult {
  // Keep the original position of every character, so errors point at the input.
  const positions: number[] = [];
  let token = "";
  const prefix = /^\s*(?:Bearer\s+)?/i.exec(text)?.[0].length ?? 0;
  for (let i = prefix; i < text.length; i++) {
    if (/\s/.test(text[i]!)) continue;
    positions.push(i);
    token += text[i];
  }
  const fail = (index: number, message: string): DecodeResult => {
    const offset = positions[Math.min(index, positions.length - 1)] ?? 0;
    return { ok: false, error: { message, offset, ...locate(text, offset) } };
  };

  if (token === "") return fail(0, "Paste a JWT to decode.");
  const parts = token.split(".");
  if (parts.length === 5) {
    return fail(
      0,
      "This is an encrypted token (JWE, 5 parts). Its contents can only be read with the decryption key, which this tool doesn’t do.",
    );
  }
  if (parts.length !== 3) {
    return fail(
      parts.length > 3 ? token.split(".", 3).join(".").length : token.length - 1,
      `This has ${parts.length} part${parts.length === 1 ? "" : "s"} separated by dots; a JWT has 3: header.payload.signature. Check that it was copied in full.`,
    );
  }

  const starts = [0, parts[0]!.length + 1, parts[0]!.length + parts[1]!.length + 2];
  const names = ["header", "payload", "signature"];
  const decoded: Uint8Array[] = [];
  for (let i = 0; i < 3; i++) {
    const result = base64UrlToBytes(parts[i]!);
    if (!(result instanceof Uint8Array)) {
      const char = parts[i]![result.badIndex] ?? "";
      return fail(
        starts[i]! + Math.max(result.badIndex, 0),
        char && !/[A-Za-z0-9_-]/.test(char)
          ? `The ${names[i]} contains “${char}”, which isn’t base64url. JWT parts use only A–Z, a–z, 0–9, “-” and “_”.`
          : `The ${names[i]} has an impossible length for base64url. Check that the token was copied in full.`,
      );
    }
    if (i < 2 && result.length === 0) return fail(starts[i]!, `The ${names[i]} is empty.`);
    decoded.push(result);
  }

  let headerText: string;
  let payloadText: string;
  try {
    headerText = utf8.decode(decoded[0]);
  } catch {
    return fail(starts[0]!, "The header isn’t valid UTF-8 text, so this isn’t a JWT.");
  }
  try {
    payloadText = utf8.decode(decoded[1]);
  } catch {
    return fail(starts[1]!, "The payload isn’t valid UTF-8 text.");
  }

  let header: unknown;
  try {
    header = JSON.parse(headerText);
  } catch {
    return fail(starts[0]!, "The header doesn’t decode to JSON, so this isn’t a JWT.");
  }
  if (typeof header !== "object" || header === null || Array.isArray(header)) {
    return fail(starts[0]!, 'The header must be a JSON object, such as {"alg":"HS256"}.');
  }
  const headerObject = header as Record<string, unknown>;

  let payload: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(payloadText);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    // Signed non-JSON content (JWS) is shown as text.
  }

  const claims: Claim[] = Object.entries(payload ?? {}).map(([name, value]) => ({
    name,
    value: typeof value === "string" ? value : JSON.stringify(value),
    description: REGISTERED[name] ?? null,
    timeMs:
      TIME_CLAIMS.has(name) && typeof value === "number" && Number.isFinite(value)
        ? value * 1000
        : null,
  }));
  const timeOf = (name: string) => claims.find((claim) => claim.name === name)?.timeMs ?? null;
  const expiresMs = timeOf("exp");
  const notBeforeMs = timeOf("nbf");
  const status: TimeStatus =
    notBeforeMs !== null && now < notBeforeMs
      ? "not-yet-valid"
      : expiresMs === null
        ? "no-expiry"
        : now >= expiresMs
          ? "expired"
          : "valid";
  const alg = typeof headerObject.alg === "string" ? headerObject.alg : null;

  return {
    ok: true,
    jwt: {
      token,
      header: headerObject,
      payload,
      payloadText,
      headerJson: JSON.stringify(headerObject, null, 2),
      payloadJson: payload ? JSON.stringify(payload, null, 2) : payloadText,
      alg,
      claims,
      status,
      expiresMs,
      notBeforeMs,
      unsecured: alg?.toLowerCase() === "none",
      signatureLength: decoded[2]!.length,
    },
  };
}
