import { GUIDES } from "@/guides/registry";
import { buildLlmsTxt } from "@/lib/llms";
import { publishedTools } from "@/tools/registry";

// Emitted as out/llms.txt at build time (P8-T15).
export const dynamic = "force-static";

export function GET() {
  const text = buildLlmsTxt(
    publishedTools(),
    GUIDES.map((guide) => guide.meta),
  );
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
