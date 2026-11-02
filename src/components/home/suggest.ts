// Homepage suggestions (G-2, G-3): which tools can open the dropped files or
// the pasted text. Pure functions; registry data comes in as arguments.

import { detect, type DetectorMatch } from "@/lib/detect";
import type { FileKind } from "@/lib/files/sniff";
import type { SearchEntry } from "@/tools/search-index";
import type { ToolDefinition } from "@/tools/types";

/** What the hero needs per tool: search fields plus inputs. */
export type HeroTool = SearchEntry & {
  accepts?: NonNullable<ToolDefinition["input"]["accepts"]>;
  detect?: string[];
};

/** Tools offered first when several can open a file, most common job first. */
const FILE_PRIORITY = [
  "merge-pdf",
  "split-pdf",
  "organize-pdf",
  "pdf-to-jpg",
  "sign-pdf",
  "compress-image",
  "convert-image",
  "resize-image",
  "remove-exif-data",
  "jpg-to-pdf",
  "json-formatter",
  "diff-checker",
];

const KIND_MIME: Record<FileKind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  bmp: "image/bmp",
};

/** A dropped file as sniffed by magic bytes (`kind` is null for text and unknown types). */
export type DroppedFile = { name: string; kind: FileKind | null };

export type FileSuggestions = {
  /** Tools made for these files, best first. */
  tools: HeroTool[];
  /** Tools that take any file (hash, Base64), offered when no tool above fits. */
  anyFile: HeroTool[];
};

const isAnyFile = (tool: HeroTool) => tool.accepts?.mime.includes("*/*") ?? false;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Types come from magic bytes (CLAUDE.md); the extension counts only for
 * files without a signature, such as JSON and plain text.
 */
function accepts(tool: HeroTool, file: DroppedFile): boolean {
  if (!tool.accepts) return false;
  if (file.kind) return tool.accepts.mime.includes(KIND_MIME[file.kind]);
  return tool.accepts.extensions.includes(extensionOf(file.name));
}

export function suggestForFiles(tools: readonly HeroTool[], files: DroppedFile[]): FileSuggestions {
  if (files.length === 0) return { tools: [], anyFile: [] };
  const many = files.length > 1;
  const fits = tools.filter(
    (tool) =>
      !isAnyFile(tool) &&
      (!many || tool.accepts?.multiple) &&
      files.every((file) => accepts(tool, file)),
  );
  const rank = (tool: HeroTool) => {
    const index = FILE_PRIORITY.indexOf(tool.slug);
    return index === -1 ? FILE_PRIORITY.length : index;
  };
  const sorted = [...fits].sort((a, b) => rank(a) - rank(b));
  const anyFile =
    sorted.length === 0
      ? tools.filter((tool) => isAnyFile(tool) && (!many || tool.accepts?.multiple))
      : [];
  return { tools: sorted, anyFile };
}

/** Auto-open at this confidence or more, with no close second (tool-registry §5). Weaker matches are offered as a choice. */
export const OPEN_CONFIDENCE = 0.7;
/** Matches below this are ignored: the paste is treated as a search query. */
export const SUGGEST_CONFIDENCE = 0.5;
const TIE_MARGIN = 0.1;

export type PasteSuggestion =
  | { action: "open"; tool: HeroTool; detector: string }
  | { action: "choose"; options: { tool: HeroTool; detector: string }[] }
  | { action: "none" };

/**
 * Smart paste (G-3): detectors decide; the highest confidence wins, and a
 * close call between different tools becomes a short choice list.
 */
export function suggestForText(
  tools: readonly HeroTool[],
  text: string,
  run: (text: string) => DetectorMatch[] = detect,
): PasteSuggestion {
  const seen = new Set<string>();
  const options = run(text)
    .filter((match) => match.confidence >= SUGGEST_CONFIDENCE)
    .flatMap((match) => {
      const tool = tools.find((t) => t.detect?.includes(match.id));
      // One entry per tool: url and url-encoded both lead to the URL tool.
      if (!tool || seen.has(tool.slug)) return [];
      seen.add(tool.slug);
      return [{ tool, detector: match.id, confidence: match.confidence }];
    });
  const [best, second] = options;
  if (!best) return { action: "none" };
  const clear =
    best.confidence >= OPEN_CONFIDENCE &&
    (!second || best.confidence - second.confidence > TIE_MARGIN);
  if (clear) return { action: "open", tool: best.tool, detector: best.detector };
  return { action: "choose", options: options.map(({ tool, detector }) => ({ tool, detector })) };
}
