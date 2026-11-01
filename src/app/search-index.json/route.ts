import { publishedTools } from "@/tools/registry";
import { buildSearchIndex } from "@/tools/search-index";

// Emitted as out/search-index.json at build time; the command palette fetches
// it on first open (tool-registry §4).
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex(publishedTools()));
}
