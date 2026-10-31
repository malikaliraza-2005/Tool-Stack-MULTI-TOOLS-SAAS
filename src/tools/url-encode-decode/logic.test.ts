import { describe, expect, it } from "vitest";
import {
  decode,
  encode,
  hostnameToUnicode,
  parseUrl,
  punycodeDecode,
  type EncodeOptions,
} from "./logic";

const COMPONENT: EncodeOptions = { scope: "component", plusForSpace: false };
const FULL: EncodeOptions = { scope: "full", plusForSpace: false };

function encoded(text: string, options = COMPONENT) {
  const result = encode(text, options);
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result.output;
}

function decoded(text: string, plusAsSpace = false) {
  const result = decode(text, { plusAsSpace });
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result.output;
}

function decodeError(text: string) {
  const result = decode(text, { plusAsSpace: false });
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

function parsed(text: string) {
  const result = parseUrl(text);
  if (!result.ok) throw new Error(`unexpected error: ${result.error.message}`);
  return result.url;
}

describe("encode", () => {
  it("component mode encodes every reserved character", () => {
    expect(encoded(":/?#[]@!$&'()*+,;= ")).toBe("%3A%2F%3F%23%5B%5D%40!%24%26'()*%2B%2C%3B%3D%20");
    expect(encoded("A-Z a_z 0.9~")).toBe("A-Z%20a_z%200.9~");
  });

  it("full URL mode keeps the URL structure", () => {
    expect(encoded("https://example.com/a b/ü?q=1&r=a b#frag", FULL)).toBe(
      "https://example.com/a%20b/%C3%BC?q=1&r=a%20b#frag",
    );
  });

  it("encodes UTF-8, with spaces as + for forms", () => {
    expect(encoded("Grüße 👋")).toBe("Gr%C3%BC%C3%9Fe%20%F0%9F%91%8B");
    expect(encoded("a b+c", { scope: "component", plusForSpace: true })).toBe("a+b%2Bc");
  });

  it("refuses lone surrogates with their position", () => {
    const result = encode("ab\ud83d", COMPONENT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatchObject({ offset: 2, line: 1, column: 3 });
  });
});

describe("decode", () => {
  it("round-trips any text", () => {
    for (const text of [
      "",
      "plain",
      "a b&c=d/e?f#g",
      "Grüße 👋 こんにちは",
      "100% sure",
      "+ and %2B",
    ]) {
      expect(decoded(encoded(text))).toBe(text);
      expect(decoded(encoded(text, FULL))).toBe(text);
      expect(decoded(encoded(text, { scope: "component", plusForSpace: true }), true)).toBe(text);
    }
  });

  it("decodes mixed text and keeps unencoded characters", () => {
    expect(decoded("caf%C3%A9 au lait")).toBe("café au lait");
    expect(decoded("%e2%82%ac")).toBe("€");
    expect(decoded("a+b%2Bc")).toBe("a+b+c");
    expect(decoded("a+b%2Bc", true)).toBe("a b+c");
  });

  it("reports the position of a malformed escape", () => {
    expect(decodeError("ok\n50%")).toMatchObject({ line: 2, column: 3, offset: 5 });
    expect(decodeError("ok\n50%").message).toMatch(/^“%” isn’t a valid escape/);
    expect(decodeError("a%zzb").message).toMatch(/^“%zz” isn’t a valid escape.*%25/);
    expect(decodeError("a%4")).toMatchObject({ offset: 1 });
  });

  it("reports invalid UTF-8 sequences", () => {
    expect(decodeError("x%C3%28y")).toMatchObject({ offset: 1 });
    expect(decodeError("x%C3%28y").message).toMatch(/^“%C3%28” isn’t valid UTF-8/);
    // Latin-1 encoded "é" (from older systems).
    expect(decodeError("caf%E9").message).toMatch(/isn’t valid UTF-8/);
    // Cut off in the middle of a character.
    expect(decodeError("%F0%9F%91").message).toMatch(/isn’t valid UTF-8/);
  });
});

describe("parse", () => {
  it("splits a URL into its parts", () => {
    const url = parsed(
      "  https://ada:s3cr%40t@example.com:8443/a%20b/c?x=1&y=two%20words#top%20part ",
    );
    expect(url).toMatchObject({
      protocol: "https:",
      username: "ada",
      password: "s3cr@t",
      hostname: "example.com",
      hostnameUnicode: null,
      port: "8443",
      defaultPort: "443",
      origin: "https://example.com:8443",
      pathname: "/a%20b/c",
      pathnameDecoded: "/a b/c",
      search: "?x=1&y=two%20words",
      hash: "top part",
    });
    expect(url.params).toEqual([
      { key: "x", value: "1", repeated: false },
      { key: "y", value: "two words", repeated: false },
    ]);
  });

  it("shows repeated parameters and form-encoded values", () => {
    const url = parsed("https://shop.example/search?tag=red&tag=blue&q=a+b&empty=&flag");
    expect(url.params).toEqual([
      { key: "tag", value: "red", repeated: true },
      { key: "tag", value: "blue", repeated: true },
      { key: "q", value: "a b", repeated: false },
      { key: "empty", value: "", repeated: false },
      { key: "flag", value: "", repeated: false },
    ]);
  });

  it("handles IPv6 hosts and default ports", () => {
    const url = parsed("http://[2001:db8::1]:80/");
    expect(url.hostname).toBe("[2001:db8::1]");
    // The default port is dropped by the URL parser.
    expect(url.port).toBe("");
    expect(url.defaultPort).toBe("80");
    expect(parsed("http://[::1]:3000/x").port).toBe("3000");
  });

  it("shows international domain names in Unicode and punycode", () => {
    const url = parsed("https://münchen.de/straße");
    expect(url.hostname).toBe("xn--mnchen-3ya.de");
    expect(url.hostnameUnicode).toBe("münchen.de");
    expect(url.pathnameDecoded).toBe("/straße");
    expect(parsed("https://xn--fsq.xn--zckzah/").hostnameUnicode).toBe("例.テスト");
  });

  it("explains invalid URLs", () => {
    const missing = parseUrl("example.com/path");
    expect(!missing.ok && missing.error.message).toMatch(/no scheme.*https:\/\/example\.com\/path/);
    const broken = parseUrl("http://exa mple.com");
    expect(!broken.ok && broken.error.message).toMatch(/^This isn’t a valid URL/);
    const empty = parseUrl("  ");
    expect(!empty.ok && empty.error.message).toBe("Enter a URL to parse.");
  });

  it("parses non-hierarchical URLs", () => {
    const url = parsed("mailto:ada@example.com?subject=Hi%20there");
    expect(url).toMatchObject({ protocol: "mailto:", hostname: "", origin: "" });
    expect(url.params).toEqual([{ key: "subject", value: "Hi there", repeated: false }]);
  });
});

describe("punycode", () => {
  it("decodes RFC 3492 samples", () => {
    expect(punycodeDecode("mnchen-3ya")).toBe("münchen");
    expect(punycodeDecode("ihqwcrb4cv8a8dqg056pqjye")).toBe("他们为什么不说中文");
    expect(punycodeDecode("egbpdaj6bu4bxfgehfvwxn")).toBe("ليهمابتكلموشعربي؟");
    expect(hostnameToUnicode("www.xn--bcher-kva.example")).toBe("www.bücher.example");
    expect(hostnameToUnicode("xn--invalid!.com")).toBe("xn--invalid!.com");
  });
});
