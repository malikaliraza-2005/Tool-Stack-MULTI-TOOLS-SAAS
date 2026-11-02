import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { isToolError } from "@/lib/errors";
import { mergePdfs } from "@/tools/merge-pdf/logic";
import { makePdf, toArrayBuffer } from "./__fixtures__/pdfs";
import { loadPdf } from "./load";

// Hostile PDFs (P9-T13): files built to hang or exhaust a parser must fail
// fast with a ToolError, or be handled without decoding what they hide.

/** A PDF from numbered object bodies, with a correct cross-reference table. */
function rawPdf(objects: (string | Uint8Array)[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.7\n")];
  const offsets: number[] = [];
  let length = parts[0]!.length;
  const push = (part: Uint8Array) => {
    parts.push(part);
    length += part.length;
  };
  objects.forEach((body, index) => {
    offsets.push(length);
    push(encoder.encode(`${index + 1} 0 obj\n`));
    push(typeof body === "string" ? encoder.encode(body) : body);
    push(encoder.encode("\nendobj\n"));
  });
  const xref = length;
  const rows = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  push(
    encoder.encode(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${rows}` +
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
    ),
  );
  const out = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const input = (name: string, bytes: Uint8Array) => ({ name, bytes: toArrayBuffer(bytes) });

/** Resolves to the ToolError code, or "loaded" with the page count. */
async function outcome(bytes: Uint8Array) {
  try {
    const doc = await loadPdf(input("hostile.pdf", bytes), "Test");
    return `loaded ${doc.getPageCount()}`;
  } catch (error) {
    return isToolError(error) ? error.code : `unexpected ${String(error)}`;
  }
}

describe("hostile PDFs", () => {
  it("a page tree that contains itself fails fast", async () => {
    const pdf = rawPdf([
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [2 0 R 3 0 R] /Count 2 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    ]);
    const started = performance.now();
    const result = await outcome(pdf);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(result).toBe("E_CORRUPT");
  });

  it("a /Count far above the real page count isn't trusted", async () => {
    const pdf = rawPdf([
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1000000000 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    ]);
    // The page count comes from walking the tree, so no tool plans a billion pages.
    expect(await outcome(pdf)).toBe("loaded 1");
  });

  it("a page larger than any real paper loads; rendering limits apply later", async () => {
    // 14 400 pt is the PDF maximum (200 inches); pdf-to-jpg scales it to its pixel limit.
    const pdf = rawPdf([
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 14400 14400] >>",
    ]);
    expect(await outcome(pdf)).toBe("loaded 1");
  });

  it("a content stream that inflates to 512 MB is copied, never decoded", async () => {
    const bomb = deflateSync(Buffer.alloc(512 * 2 ** 20, 0x20), { level: 9 });
    const pdf = rawPdf([
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>",
      new Uint8Array([
        ...new TextEncoder().encode(`<< /Length ${bomb.length} /Filter /FlateDecode >>\nstream\n`),
        ...bomb,
        ...new TextEncoder().encode("\nendstream"),
      ]),
    ]);
    expect(pdf.length).toBeLessThan(2 * 2 ** 20);
    const other = await makePdf("other", [[612, 792]]);
    const merged = await mergePdfs([input("bomb.pdf", pdf), input("other.pdf", other)]);
    expect(merged.pageCount).toBe(2);
    // Still compressed in the output: the stream was never inflated.
    expect(merged.bytes.length).toBeLessThan(4 * 2 ** 20);
  }, 20_000);

  it("garbage after a PDF header is reported as damaged", async () => {
    const junk = new Uint8Array(64 * 1024).map((_, i) => (i * 7919) % 256);
    junk.set(new TextEncoder().encode("%PDF-1.7\n"));
    expect(await outcome(junk)).toBe("E_CORRUPT");
  });
});
