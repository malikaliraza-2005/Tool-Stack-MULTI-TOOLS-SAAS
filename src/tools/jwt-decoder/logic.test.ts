import { exportJWK, exportSPKI, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeJwt } from "./logic";
import { verifySignature } from "./verify";

const NOW = Date.UTC(2026, 9, 31, 12); // fixed clock for status tests
const SECONDS = NOW / 1000;
const SECRET = "a-very-secret-key-of-at-least-32-bytes!";

// jwt.io's well-known example (HS256, secret "your-256-bit-secret").
const JWT_IO =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function decoded(text: string, now = NOW) {
  const result = decodeJwt(text, now);
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result.jwt;
}

function failure(text: string) {
  const result = decodeJwt(text, NOW);
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

const sign = (
  alg: string,
  key: Parameters<SignJWT["sign"]>[0],
  claims: Record<string, unknown> = {},
) =>
  new SignJWT({ sub: "user-42", role: "admin", ...claims })
    .setProtectedHeader({ alg, typ: "JWT" })
    .sign(key);

let rsa: Awaited<ReturnType<typeof generateKeyPair>>;
let ec: Awaited<ReturnType<typeof generateKeyPair>>;
let hs256: string;
let rs256: string;
let es256: string;

beforeAll(async () => {
  rsa = await generateKeyPair("RS256", { extractable: true });
  ec = await generateKeyPair("ES256", { extractable: true });
  hs256 = await sign("HS256", new TextEncoder().encode(SECRET), {
    exp: SECONDS + 3600,
    iat: SECONDS - 60,
  });
  rs256 = await sign("RS256", rsa.privateKey, { exp: SECONDS - 3 * 3600 });
  es256 = await sign("ES256", ec.privateKey, { nbf: SECONDS + 600 });
});

describe("decode", () => {
  it("decodes HS256, RS256 and ES256 tokens", () => {
    for (const [token, alg] of [
      [hs256, "HS256"],
      [rs256, "RS256"],
      [es256, "ES256"],
    ] as const) {
      const jwt = decoded(token);
      expect(jwt.alg).toBe(alg);
      expect(jwt.header).toEqual({ alg, typ: "JWT" });
      expect(jwt.payload).toMatchObject({ sub: "user-42", role: "admin" });
      expect(jwt.headerJson).toBe(JSON.stringify({ alg, typ: "JWT" }, null, 2));
    }
    expect(decoded(JWT_IO).payload).toEqual({
      sub: "1234567890",
      name: "John Doe",
      iat: 1516239022,
    });
  });

  it("computes the time status with a fixed clock", () => {
    expect(decoded(hs256).status).toBe("valid");
    expect(decoded(rs256).status).toBe("expired");
    expect(decoded(es256).status).toBe("not-yet-valid");
    expect(decoded(JWT_IO).status).toBe("no-expiry");
    // The same token expires once the clock passes exp.
    expect(decoded(hs256, NOW + 3600 * 1000).status).toBe("expired");
    expect(decoded(hs256, NOW + 3599 * 1000).status).toBe("valid");
  });

  it("lists claims with descriptions and times", () => {
    const claims = decoded(hs256).claims;
    expect(claims.find((c) => c.name === "exp")).toEqual({
      name: "exp",
      value: String(SECONDS + 3600),
      description: "Expires",
      timeMs: NOW + 3600 * 1000,
    });
    expect(claims.find((c) => c.name === "role")).toEqual({
      name: "role",
      value: "admin",
      description: null,
      timeMs: null,
    });
  });

  it("trims whitespace, line breaks and the Bearer prefix", () => {
    const wrapped = `  Bearer ${JWT_IO.slice(0, 40)}\n${JWT_IO.slice(40)}\n`;
    expect(decoded(wrapped).token).toBe(JWT_IO);
    expect(decoded(`bearer ${JWT_IO}`).alg).toBe("HS256");
  });

  it("flags alg: none", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "x" })).toString("base64url");
    const jwt = decoded(`${header}.${payload}.`);
    expect(jwt.unsecured).toBe(true);
    expect(jwt.signatureLength).toBe(0);
  });

  it("shows a non-JSON payload as text", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const jwt = decoded(`${header}.${Buffer.from("plain text").toString("base64url")}.c2ln`);
    expect(jwt.payload).toBeNull();
    expect(jwt.payloadJson).toBe("plain text");
    expect(jwt.claims).toEqual([]);
  });
});

describe("malformed tokens", () => {
  it("two segments", () => {
    const [h, p] = JWT_IO.split(".");
    expect(failure(`${h}.${p}`).message).toMatch(
      /^This has 2 parts separated by dots; a JWT has 3/,
    );
  });

  it("bad base64url, located", () => {
    const [h, p, s] = JWT_IO.split(".");
    const bad = `${h}.${p!.slice(0, 10)}+${p!.slice(11)}.${s}`;
    const error = failure(bad);
    expect(error.offset).toBe(h!.length + 1 + 10);
    expect(error.message).toMatch(/^The payload contains “\+”, which isn’t base64url/);
    // Positions point into the original input, including a Bearer prefix.
    expect(failure(`Bearer ${bad}`).offset).toBe(7 + h!.length + 1 + 10);
  });

  it("non-JSON header", () => {
    const header = Buffer.from("not json").toString("base64url");
    const error = failure(`${header}.${JWT_IO.split(".")[1]}.sig`);
    expect(error).toMatchObject({ offset: 0, line: 1, column: 1 });
    expect(error.message).toMatch(/header doesn’t decode to JSON/);
  });

  it("encrypted tokens and empty input", () => {
    expect(failure("a.b.c.d.e").message).toMatch(/encrypted token \(JWE/);
    expect(failure("  ").message).toBe("Paste a JWT to decode.");
  });
});

describe("verify", () => {
  it("HS256: right and wrong secret", async () => {
    expect(await verifySignature(hs256, "HS256", SECRET)).toEqual({ status: "verified" });
    expect(await verifySignature(hs256, "HS256", "wrong")).toEqual({ status: "invalid" });
    expect(await verifySignature(JWT_IO, "HS256", "your-256-bit-secret")).toEqual({
      status: "verified",
    });
  });

  it("RS256 with a PEM public key; ES256 with a JWK and a JWKS", async () => {
    expect(await verifySignature(rs256, "RS256", await exportSPKI(rsa.publicKey))).toEqual({
      status: "verified",
    });
    const jwk = await exportJWK(ec.publicKey);
    expect(await verifySignature(es256, "ES256", JSON.stringify(jwk))).toEqual({
      status: "verified",
    });
    expect(
      await verifySignature(es256, "ES256", JSON.stringify({ keys: [{ ...jwk, alg: "ES256" }] })),
    ).toEqual({
      status: "verified",
    });
    const other = await generateKeyPair("ES256", { extractable: true });
    expect(
      await verifySignature(es256, "ES256", JSON.stringify(await exportJWK(other.publicKey))),
    ).toEqual({
      status: "invalid",
    });
  });

  it("explains key problems", async () => {
    const ecPem = await exportSPKI(ec.publicKey);
    const mismatch = await verifySignature(rs256, "RS256", ecPem);
    expect(mismatch.status).toBe("error");
    expect(mismatch.status === "error" && mismatch.message).toMatch(
      /^Key type doesn’t match algorithm RS256/,
    );

    const priv = await verifySignature(
      rs256,
      "RS256",
      "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    );
    expect(priv.status === "error" && priv.message).toMatch(/This is a private key/);
    const junk = await verifySignature(rs256, "RS256", "hello");
    expect(junk.status === "error" && junk.message).toMatch(/key isn’t recognised/);
    const none = await verifySignature("e30.e30.", "none", "");
    expect(none.status === "error" && none.message).toMatch(/isn’t signed/);
    const empty = await verifySignature(hs256, "HS256", "");
    expect(empty.status === "error" && empty.message).toBe(
      "Enter the secret the token was signed with.",
    );
  });
});
