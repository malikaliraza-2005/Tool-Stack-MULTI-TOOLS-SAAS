import { describe, expect, it } from "vitest";
import { publishedTools } from "@/tools/registry";
import { heroTools } from "./hero-tools";
import { suggestForFiles, suggestForText } from "./suggest";

const tools = heroTools(publishedTools());
const slugs = (list: { slug: string }[]) => list.map((tool) => tool.slug);

describe("drop-zone suggestions (G-2)", () => {
  it("offers the PDF tools for a PDF, merge first", () => {
    const { tools: fit, anyFile } = suggestForFiles(tools, [{ name: "a.pdf", kind: "pdf" }]);
    expect(slugs(fit)).toEqual([
      "merge-pdf",
      "split-pdf",
      "organize-pdf",
      "pdf-to-jpg",
      "sign-pdf",
    ]);
    expect(anyFile).toEqual([]);
  });

  it("offers only multi-file tools for several files", () => {
    const pdfs = [
      { name: "a.pdf", kind: "pdf" as const },
      { name: "b.pdf", kind: "pdf" as const },
    ];
    expect(slugs(suggestForFiles(tools, pdfs).tools)).toEqual(["merge-pdf"]);
  });

  it("offers the image tools and JPG to PDF for a photo", () => {
    const fit = slugs(suggestForFiles(tools, [{ name: "a.jpg", kind: "jpeg" }]).tools);
    expect(fit).toEqual([
      "compress-image",
      "convert-image",
      "resize-image",
      "remove-exif-data",
      "jpg-to-pdf",
    ]);
  });

  it("offers HEIC only to the tools that decode it", () => {
    const fit = slugs(suggestForFiles(tools, [{ name: "IMG_1.HEIC", kind: "heic" }]).tools);
    expect(fit).toEqual(["convert-image", "jpg-to-pdf"]);
  });

  it("trusts magic bytes over the extension", () => {
    const fit = slugs(suggestForFiles(tools, [{ name: "photo.pdf", kind: "png" }]).tools);
    expect(fit).not.toContain("merge-pdf");
    expect(fit).toContain("compress-image");
  });

  it("uses the extension for files without a signature", () => {
    expect(slugs(suggestForFiles(tools, [{ name: "data.json", kind: null }]).tools)).toEqual([
      "json-formatter",
    ]);
  });

  it("offers any-file tools for an unsupported file", () => {
    const result = suggestForFiles(tools, [{ name: "archive.zip", kind: null }]);
    expect(result.tools).toEqual([]);
    expect(slugs(result.anyFile).sort()).toEqual(["base64-encode-decode", "hash-generator"]);
  });

  it("offers nothing for mixed files no tool takes together", () => {
    const result = suggestForFiles(tools, [
      { name: "a.pdf", kind: "pdf" },
      { name: "b.jpg", kind: "jpeg" },
    ]);
    expect(result).toEqual({ tools: [], anyFile: [] });
  });
});

describe("smart paste (G-3)", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  it.each([
    [jwt, "jwt-decoder", "jwt"],
    ['{"name": "Sprigkit", "tools": 19}', "json-formatter", "json"],
    ["1700000000", "unix-timestamp-converter", "unix-timestamp"],
    ["https://example.com/search?q=private%20tools", "url-encode-decode", "url"],
    ["name%3DSprigkit%26tools%3D19", "url-encode-decode", "url-encoded"],
    ["U3ByaWdraXQgcnVucyBpbiB5b3VyIGJyb3dzZXIu", "base64-encode-decode", "base64"],
    ["0190b3a2-7c1e-7b4a-9d2f-3e8a1b6c5d4f", "uuid-generator", "uuid"],
  ])("opens the right tool for %s", (text, slug, detector) => {
    const result = suggestForText(tools, text);
    expect(result).toMatchObject({ action: "open", tool: { slug }, detector });
  });

  it("treats ordinary text as a search query", () => {
    expect(suggestForText(tools, "merge pdf")).toEqual({ action: "none" });
  });

  it("offers a choice when two tools are close", () => {
    const result = suggestForText(tools, "x", () => [
      { id: "base64", confidence: 0.9 },
      { id: "json", confidence: 0.85 },
    ]);
    expect(result.action).toBe("choose");
    if (result.action === "choose") {
      expect(result.options.map((o) => o.tool.slug)).toEqual([
        "base64-encode-decode",
        "json-formatter",
      ]);
    }
  });

  it("lists a tool once even when two of its detectors match", () => {
    const result = suggestForText(tools, "x", () => [
      { id: "url", confidence: 0.6 },
      { id: "url-encoded", confidence: 0.6 },
    ]);
    expect(result).toMatchObject({ action: "choose", options: [{ detector: "url" }] });
    if (result.action === "choose") expect(result.options).toHaveLength(1);
  });
});
