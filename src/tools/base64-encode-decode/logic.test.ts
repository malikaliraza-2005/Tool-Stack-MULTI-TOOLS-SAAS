import { describe, expect, it } from "vitest";
import { SAMPLE_BASE64, SAMPLE_TEXT } from "./constants";
import {
  bytesAsText,
  decode,
  decodedType,
  encodeBytes,
  encodeText,
  mimeForFile,
  runJob,
  toDataUrl,
  type EncodeOptions,
} from "./logic";

const STANDARD: EncodeOptions = { urlSafe: false, wrap: false };
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];

function decoded(text: string) {
  const result = decode(text);
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result;
}

const decodedText = (text: string) => new TextDecoder().decode(decoded(text).bytes);

function errorOf(text: string) {
  const result = decode(text);
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("encode", () => {
  it("matches RFC 4648 test vectors", () => {
    const vectors = ["", "Zg==", "Zm8=", "Zm9v", "Zm9vYg==", "Zm9vYmE=", "Zm9vYmFy"];
    "foobar".split("").forEach((_, i) => {
      expect(encodeText("foobar".slice(0, i), STANDARD)).toBe(vectors[i]);
    });
    expect(encodeText("foobar", STANDARD)).toBe(vectors[6]);
  });

  it("encodes UTF-8, including emoji and non-Latin scripts", () => {
    expect(encodeText(SAMPLE_TEXT, STANDARD)).toBe(SAMPLE_BASE64);
    expect(encodeText("€", STANDARD)).toBe("4oKs");
    expect(encodeText("🦄", STANDARD)).toBe("8J+mhA==");
  });

  it("URL-safe uses - and _ without padding", () => {
    const bytes = Uint8Array.from([0xfb, 0xff, 0xbf, 0xfe]);
    expect(encodeBytes(bytes, STANDARD)).toBe("+/+//g==");
    expect(encodeBytes(bytes, { urlSafe: true, wrap: false })).toBe("-_-__g");
  });

  it("wraps at 76 characters", () => {
    const output = encodeBytes(new Uint8Array(100), { urlSafe: false, wrap: true });
    const lines = output.split("\n");
    expect(lines.map((line) => line.length)).toEqual([76, 60]);
  });

  it("encodes large input in chunks that join correctly", () => {
    const bytes = Uint8Array.from({ length: 200_001 }, (_, i) => (i * 31) % 256);
    expect(encodeBytes(bytes, STANDARD)).toBe(Buffer.from(bytes).toString("base64"));
  });

  it("builds data URLs with the standard alphabet on one line", () => {
    expect(toDataUrl(Uint8Array.from([0xfb, 0xff]), "image/png")).toBe(
      "data:image/png;base64,+/8=",
    );
  });
});

describe("decode", () => {
  it("round-trips UTF-8 text", () => {
    expect(decodedText(SAMPLE_BASE64)).toBe(SAMPLE_TEXT);
    for (const text of ["", "a", "ab", "abc", "🦄 unicorn", "Ελληνικά", "中文", "עִבְרִית"]) {
      expect(decodedText(encodeText(text, STANDARD))).toBe(text);
      expect(decodedText(encodeText(text, { urlSafe: true, wrap: true }))).toBe(text);
    }
  });

  it("accepts both alphabets, missing padding and whitespace", () => {
    expect(decoded("-_-__g").bytes).toEqual(Uint8Array.from([0xfb, 0xff, 0xbf, 0xfe]));
    expect(decoded("+/+//g==").bytes).toEqual(Uint8Array.from([0xfb, 0xff, 0xbf, 0xfe]));
    expect(decodedText("Zm9vYg")).toBe("foob");
    expect(decodedText("  Zm9v\r\n YmFy \n")).toBe("foobar");
  });

  it("is byte-identical for binary data", () => {
    const bytes = Uint8Array.from({ length: 70_000 }, (_, i) => (i * 7 + 3) % 256);
    const result = runJob({
      op: "encode-file",
      bytes: bytes.slice().buffer,
      browserType: "",
      options: { urlSafe: false, wrap: true, dataUrl: false },
    });
    if (result.op !== "encode") throw new Error("expected encode");
    expect(decoded(result.output).bytes).toEqual(bytes);
  });

  it("reports the position of an invalid character", () => {
    expect(errorOf("Zm9v\nYm!y")).toMatchObject({ line: 2, column: 3, offset: 7 });
    expect(errorOf("Zm9v\nYm!y").message).toMatch(/^“!” isn’t a Base64 character\./);
    expect(errorOf("Zm9vé").message).toMatch(/^“é” isn’t/);
    expect(errorOf("Zm9v😀").message).toMatch(/^“😀” isn’t/);
    expect(errorOf("SGVsbG8%3D").message).toMatch(/URL-encoded/);
    expect(errorOf('"SGk="').message).toMatch(/^A double quote \("\) isn’t a Base64 character\./);
    expect(errorOf("SGk\u00a0").message).toMatch(/^A non-breaking space isn’t/);
  });

  it("explains length and padding problems", () => {
    expect(errorOf("Zm9vY")).toMatchObject({ offset: 4 });
    expect(errorOf("Zm9vY").message).toMatch(/has 5 characters, which can’t be complete/);
    expect(errorOf("Zg=").message).toMatch(/^Wrong padding: 1 “=” after 2 characters/);
    expect(errorOf("Zm9v=").message).toMatch(/^Wrong padding/);
    expect(errorOf("Zg==Zg==")).toMatchObject({ offset: 2 });
    expect(errorOf("Zg==Zg==").message).toBe("“=” padding can only appear at the end.");
  });

  it("parses data URLs", () => {
    const png = decoded(
      `data:image/png;base64,${encodeBytes(Uint8Array.from(PNG_HEADER), STANDARD)}`,
    );
    expect(png.dataUrlMime).toBe("image/png");
    expect(Array.from(png.bytes)).toEqual(PNG_HEADER);

    const text = decoded("  data:text/plain;charset=utf-8;base64,SGk=\n");
    expect(text.dataUrlMime).toBe("text/plain");
    expect(new TextDecoder().decode(text.bytes)).toBe("Hi");

    // Without ;base64 the data is percent-encoded.
    const plain = decoded("data:,Hello%2C%20W%C3%B6rld");
    expect(plain.dataUrlMime).toBe("text/plain");
    expect(new TextDecoder().decode(plain.bytes)).toBe("Hello, Wörld");

    expect(errorOf("data:image/png;base64").message).toMatch(/no “,”/);
    expect(errorOf("data:image/png;base64,iVB!").offset).toBe(25);
    expect(errorOf("data:,100%").message).toMatch(/two hex digits/);
  });
});

describe("decoded type", () => {
  it("detects files by magic bytes before the data-URL type", () => {
    expect(decodedType(Uint8Array.from(PNG_HEADER), "text/plain")).toEqual({
      mime: "image/png",
      ext: "png",
      label: "a PNG image",
    });
    expect(decodedType(Uint8Array.from([0x50, 0x4b, 3, 4, 0]), null).ext).toBe("zip");
    expect(decodedType(Uint8Array.from([0x1f, 0x8b, 8]), null).ext).toBe("gz");
    expect(decodedType(new TextEncoder().encode("{}"), "application/json")).toEqual({
      mime: "application/json",
      ext: "json",
      label: null,
    });
    expect(decodedType(Uint8Array.from([1, 2]), "weird")).toEqual({
      mime: "application/octet-stream",
      ext: "bin",
      label: null,
    });
    expect(mimeForFile(Uint8Array.from(PNG_HEADER), "")).toBe("image/png");
    expect(mimeForFile(new TextEncoder().encode("x"), "text/csv")).toBe("text/csv");
  });

  it("shows text only for valid UTF-8 without NUL bytes", () => {
    const text = (bytes: number[] | Uint8Array, mime: string | null = null) => {
      const array = Uint8Array.from(bytes);
      return bytesAsText(array, decodedType(array, mime));
    };
    expect(text(new TextEncoder().encode("Grüße 👋"))).toBe("Grüße 👋");
    expect(text([0xc3, 0x28])).toBeNull();
    expect(text([0x61, 0x00, 0x62])).toBeNull();
    expect(text(PNG_HEADER)).toBeNull();
    expect(text(new TextEncoder().encode("<svg/>"), "image/svg+xml")).toBe("<svg/>");
  });

  it("runJob returns text and type for decode", () => {
    const result = runJob({ op: "decode", text: SAMPLE_BASE64 });
    expect(result).toMatchObject({
      op: "decode",
      ok: true,
      text: SAMPLE_TEXT,
      type: { ext: "bin" },
    });
    expect(runJob({ op: "decode", text: "!" })).toMatchObject({ op: "decode", ok: false });
  });
});
