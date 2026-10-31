// JWT signature verification with jose (tool-specifications §5.2). Loaded on
// demand: only when the user verifies. Checks the signature only; time
// claims are reported by logic.ts.

import {
  compactVerify,
  createLocalJWKSet,
  errors,
  importJWK,
  importSPKI,
  importX509,
  type CryptoKey,
  type JWK,
  type KeyObject,
} from "jose";

export type VerifyOutcome =
  { status: "verified" } | { status: "invalid" } | { status: "error"; message: string };

const HMAC = /^HS(256|384|512)$/;
const ASYMMETRIC = /^(RS|PS|ES)(256|384|512)$|^ES256K$|^EdDSA$|^Ed25519$/;

export function needsSecret(alg: string | null): boolean {
  return alg !== null && HMAC.test(alg);
}

export function isSupportedAlg(alg: string | null): boolean {
  return alg !== null && (HMAC.test(alg) || ASYMMETRIC.test(alg));
}

type Key = CryptoKey | KeyObject | Uint8Array | ReturnType<typeof createLocalJWKSet>;

/** A secret (HS*) as UTF-8 bytes, or a public key from PEM, certificate, JWK or JWKS. */
async function importKey(alg: string, keyText: string): Promise<Key | { message: string }> {
  if (HMAC.test(alg)) {
    if (keyText === "") return { message: "Enter the secret the token was signed with." };
    return new TextEncoder().encode(keyText);
  }
  const text = keyText.trim();
  if (text === "") return { message: "Paste the public key: PEM, a certificate, a JWK or a JWKS." };
  if (/-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(text)) {
    return {
      message:
        "This is a private key. Verification needs only the public key; never paste private keys into websites.",
    };
  }
  if (text.startsWith("-----BEGIN CERTIFICATE-----")) return importX509(text, alg);
  if (text.startsWith("-----BEGIN PUBLIC KEY-----")) return importSPKI(text, alg);
  if (text.startsWith("-----BEGIN RSA PUBLIC KEY-----")) {
    return {
      message:
        "This is a PKCS#1 RSA key. Convert it to a “BEGIN PUBLIC KEY” (SPKI) key, or paste the key as a JWK.",
    };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      message:
        "The key isn’t recognised. Paste a PEM public key (-----BEGIN PUBLIC KEY-----), a certificate, a JWK or a JWKS.",
    };
  }
  if (json && typeof json === "object" && Array.isArray((json as { keys?: unknown }).keys)) {
    return createLocalJWKSet(json as { keys: JWK[] });
  }
  return importJWK(json as JWK, alg);
}

/** Verifies the token's signature with a secret or public key. */
export async function verifySignature(
  token: string,
  alg: string | null,
  keyText: string,
): Promise<VerifyOutcome> {
  if (alg === null || alg.toLowerCase() === "none") {
    return {
      status: "error",
      message: "This token isn’t signed (alg: none), so there is nothing to verify.",
    };
  }
  if (!isSupportedAlg(alg)) {
    return { status: "error", message: `The algorithm “${alg}” isn’t supported for verification.` };
  }
  try {
    const key = await importKey(alg, keyText);
    if (!(key instanceof Uint8Array) && "message" in key) return { status: "error", ...key };
    if (typeof key === "function") await compactVerify(token, key, { algorithms: [alg] });
    else await compactVerify(token, key, { algorithms: [alg] });
    return { status: "verified" };
  } catch (error) {
    if (error instanceof errors.JWSSignatureVerificationFailed) return { status: "invalid" };
    if (error instanceof errors.JWKSNoMatchingKey) {
      return {
        status: "error",
        message: "No key in the JWKS matches this token’s kid and algorithm.",
      };
    }
    if (
      error instanceof TypeError ||
      // WebCrypto rejects a key of the wrong type with DataError.
      (error instanceof DOMException &&
        /DataError|NotSupportedError|InvalidAccessError/.test(error.name)) ||
      error instanceof errors.JOSENotSupported ||
      error instanceof errors.JWKInvalid
    ) {
      return {
        status: "error",
        message: `Key type doesn’t match algorithm ${alg}, or the key is malformed. ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      };
    }
    return {
      status: "error",
      message: `The token couldn’t be verified: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
