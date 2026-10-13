import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { headersFor, parseHeaders } from "./headers.mjs";

const rules = parseHeaders(readFileSync(new URL("../../public/_headers", import.meta.url), "utf8"));

describe("public/_headers", () => {
  it("sends a CSP on every page that blocks cross-origin connections", () => {
    const csp = headersFor(rules, "sprigkit.com", "/merge-pdf").get("content-security-policy");
    expect(csp).toContain("connect-src 'self' blob: data:");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("marks preview and pages.dev hosts noindex, but not production", () => {
    expect(headersFor(rules, "abc123.sprigkit.pages.dev", "/").get("x-robots-tag")).toBe("noindex");
    expect(headersFor(rules, "sprigkit.pages.dev", "/").get("x-robots-tag")).toBe("noindex");
    expect(headersFor(rules, "sprigkit.com", "/").has("x-robots-tag")).toBe(false);
  });

  it("caches hashed build assets immutably", () => {
    expect(
      headersFor(rules, "sprigkit.com", "/_next/static/chunks/a.js").get("cache-control"),
    ).toContain("immutable");
    expect(headersFor(rules, "sprigkit.com", "/").has("cache-control")).toBe(false);
  });
});
