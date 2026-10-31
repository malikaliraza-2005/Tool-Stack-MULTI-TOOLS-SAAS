import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ALGORITHMS, type Algorithm } from "./constants";
import { findMatch, formatDigest, hashBlob, hashText, toHex } from "./logic";

// Known test vectors (FIPS 180, RFC 1321).
const VECTORS: Record<Algorithm, { empty: string; abc: string }> = {
  md5: { empty: "d41d8cd98f00b204e9800998ecf8427e", abc: "900150983cd24fb0d6963f7d28e17f72" },
  sha1: {
    empty: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    abc: "a9993e364706816aba3e25717850c26c9cd0d89d",
  },
  sha256: {
    empty: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    abc: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  },
  sha384: {
    empty:
      "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b",
    abc: "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
  },
  sha512: {
    empty:
      "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    abc: "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
  },
};

const hex = async (text: string, key: string | Uint8Array | null = null) => {
  const digests = await hashText(text, ALGORITHMS, key);
  return Object.fromEntries(
    Object.entries(digests).map(([algorithm, bytes]) => [algorithm, toHex(bytes)]),
  );
};

describe("hash", () => {
  it("matches known vectors for every algorithm", async () => {
    const empty = await hex("");
    const abc = await hex("abc");
    for (const algorithm of ALGORITHMS) {
      expect(empty[algorithm]).toBe(VECTORS[algorithm].empty);
      expect(abc[algorithm]).toBe(VECTORS[algorithm].abc);
    }
    expect((await hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).sha256).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("hashes text as UTF-8", async () => {
    const text = "Grüße 👋 こんにちは";
    expect((await hex(text)).sha256).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
  });

  it("computes only the selected algorithms", async () => {
    expect(Object.keys(await hashText("abc", ["sha256", "md5"], null)).sort()).toEqual([
      "md5",
      "sha256",
    ]);
  });

  it("streams files in chunks with the same result and progress", async () => {
    const bytes = Uint8Array.from({ length: 1_000_003 }, (_, i) => (i * 31) % 251);
    const progress: number[] = [];
    const digests = await hashBlob(
      new Blob([bytes]),
      ALGORITHMS,
      null,
      (done) => progress.push(done),
      65_536,
    );
    for (const algorithm of ALGORITHMS) {
      expect(toHex(digests[algorithm]!)).toBe(createHash(algorithm).update(bytes).digest("hex"));
    }
    expect(progress).toHaveLength(Math.ceil(bytes.length / 65_536));
    expect(progress.at(-1)).toBe(1);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(toHex((await hashBlob(new Blob([]), ["sha256"], null)).sha256!)).toBe(
      VECTORS.sha256.empty,
    );
  });
});

describe("HMAC (RFC 4231)", () => {
  it("test case 2: text key", async () => {
    const result = await hex("what do ya want for nothing?", "Jefe");
    expect(result.sha256).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
    expect(result.sha384).toBe(
      "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
    );
    expect(result.sha512).toBe(
      "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
    );
    // HMAC is for the SHA family only (§5.9).
    expect(result.md5).toBeUndefined();
  });

  it("test cases 1 and 6: byte keys, including one longer than the block", async () => {
    expect((await hex("Hi There", new Uint8Array(20).fill(0x0b))).sha256).toBe(
      "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
    );
    expect(
      (
        await hex(
          "Test Using Larger Than Block-Size Key - Hash Key First",
          new Uint8Array(131).fill(0xaa),
        )
      ).sha256,
    ).toBe("60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54");
  });

  it("streams files with HMAC too", async () => {
    const digests = await hashBlob(
      new Blob(["what do ya want ", "for nothing?"]),
      ["sha256"],
      "Jefe",
      undefined,
      7,
    );
    expect(toHex(digests.sha256!)).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });
});

describe("output and compare", () => {
  const bytes = Uint8Array.from([0xde, 0xad, 0xbe, 0xef, 0xfb, 0xff]);

  it("formats hex, HEX and Base64", () => {
    expect(formatDigest(bytes, "hex")).toBe("deadbeeffbff");
    expect(formatDigest(bytes, "HEX")).toBe("DEADBEEFFBFF");
    expect(formatDigest(bytes, "base64")).toBe("3q2+7/v/");
  });

  it("finds the matching algorithm, ignoring case, spaces and prefixes", async () => {
    const digests = await hashText("abc", ALGORITHMS, null);
    expect(findMatch(VECTORS.sha256.abc, digests)).toBe("sha256");
    expect(findMatch(`  ${VECTORS.md5.abc.toUpperCase()}\n`, digests)).toBe("md5");
    expect(findMatch(`sha256:${VECTORS.sha256.abc}`, digests)).toBe("sha256");
    expect(findMatch("ba7816bf 8f01cfea 414140de", digests)).toBeNull();
    expect(findMatch(formatDigest(digests.sha1!, "base64"), digests)).toBe("sha1");
    // Base64 is case-sensitive.
    expect(findMatch(formatDigest(digests.sha1!, "base64").toLowerCase(), digests)).toBeNull();
    expect(findMatch("", digests)).toBeNull();
    expect(findMatch(VECTORS.sha512.abc, { sha256: digests.sha256 })).toBeNull();
  });
});
