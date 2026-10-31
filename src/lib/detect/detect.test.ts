// Detector precedence across all detectors (P4-T09, tool-registry §5): for
// realistic pastes, the right tool wins and unrelated detectors stay quiet.

import { describe, expect, it } from "vitest";
import { detect, DETECTOR_PRECEDENCE, DETECTORS } from "./index";

const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const PNG_BASE64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
]).toString("base64");

/** Ids of all matches, best first. */
const ids = (text: string) => detect(text).map((match) => match.id);

describe("detector precedence", () => {
  it.each([
    ["a JWT", JWT, "jwt"],
    ["a JWT with Bearer", `Bearer ${JWT}`, "jwt"],
    ["a JSON object", '{"user":{"id":7,"tags":["a","b"]}}', "json"],
    ["a JSON array of numbers", "[1700000000, 1700000001]", "json"],
    ["an http URL with escapes", "https://example.com/search?q=caf%C3%A9%20au%20lait", "url"],
    ["a URL-encoded value", "caf%C3%A9%20au%20lait%21", "url-encoded"],
    ["seconds", "1700000000", "unix-timestamp"],
    ["milliseconds", "1700000000000", "unix-timestamp"],
    ["microseconds", "1700000000000000", "unix-timestamp"],
    ["a UUID", "919108f7-52d1-4320-9bac-f847db4148a8", "uuid"],
    ["a UUID in braces", "{017F22E2-79B0-7CC3-98C4-DC0C0C07398F}", "uuid"],
    ["Base64 text", Buffer.from("Hello, world! This is a test.").toString("base64"), "base64"],
    ["a Base64 PNG", PNG_BASE64, "base64"],
    ["a data URL", `data:image/png;base64,${PNG_BASE64}`, "base64"],
  ])("%s → %s", (_, text, expected) => {
    expect(ids(text)[0]).toBe(expected);
  });

  it("unrelated detectors stay quiet for typical pastes", () => {
    expect(ids(JWT)).toEqual(["jwt"]);
    expect(ids("919108f7-52d1-4320-9bac-f847db4148a8")).toEqual(["uuid"]);
    expect(ids("1700000000000000")).toEqual(["unix-timestamp"]);
    expect(ids('{"a":1}')).toEqual(["json"]);
  });

  it("an http URL with escapes also offers URL decoding, ranked second", () => {
    expect(ids("https://example.com/?q=caf%C3%A9%20x")).toEqual(["url", "url-encoded"]);
  });

  it("ordinary text, code and numbers match nothing", () => {
    for (const text of [
      "",
      "   ",
      "Meeting moved to Thursday at 14:00.",
      "const x = a % b;",
      "42",
      "3.14159",
      "example.com",
      "deadbeefcafebabe0123456789abcdef",
      "SELECT * FROM users WHERE id = 7;",
      "HelloWorldFooBarBaz",
    ]) {
      expect(ids(text), text).toEqual([]);
    }
  });

  it("the precedence list covers every detector", () => {
    expect([...DETECTOR_PRECEDENCE].sort()).toEqual(DETECTORS.map((d) => d.id).sort());
  });
});

describe("detector speed (≤ 1 ms on 10 KB)", () => {
  const inputs: Record<string, string> = {
    prose: "The quick brown fox jumps over the lazy dog. ".repeat(230),
    json: JSON.stringify(Array.from({ length: 600 }, (_, i) => ({ id: i, name: "x" }))),
    base64: Buffer.from("Lorem ipsum dolor sit amet. ".repeat(400)).toString("base64"),
    encoded: encodeURIComponent("Grüße aus Köln, ".repeat(450)),
    digits: "1".repeat(10_240),
    jwtLike: `eyJhbGciOiJIUzI1NiJ9.${"A".repeat(10_000)}.sig`,
  };

  it.each(DETECTORS.map((detector) => [detector.id, detector] as const))("%s", (_, detector) => {
    for (const [name, text] of Object.entries(inputs)) {
      expect(text.length, name).toBeGreaterThanOrEqual(10_000);
      detector.detect(text); // warm up
      // Best of several batches, so other test files running in parallel don't make it flaky.
      const batches = Array.from({ length: 5 }, () => {
        const started = performance.now();
        for (let i = 0; i < 20; i++) detector.detect(text);
        return (performance.now() - started) / 20;
      });
      expect(Math.min(...batches), `${detector.id} on ${name}`).toBeLessThan(1);
    }
  });
});
