"use client";

import type Fuse from "fuse.js";
import { ArrowRight, FileUp, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState, type CSSProperties } from "react";
import { ToolIcon } from "@/components/tool/ToolIcon";
import { buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { formatBytes, plural } from "@/lib/files/format";
import { describeKind, sniffFile } from "@/lib/files/sniff";
import { handOff, type Handoff } from "@/lib/handoff";
import { SEARCH_OPTIONS, searchTools } from "@/tools/search-index";
import {
  suggestForFiles,
  suggestForText,
  type DroppedFile,
  type FileSuggestions,
  type HeroTool,
} from "./suggest";

const DETECTOR_LABELS: Record<string, string> = {
  jwt: "a JSON Web Token",
  json: "JSON",
  "unix-timestamp": "a Unix timestamp",
  url: "a URL",
  "url-encoded": "URL-encoded text",
  base64: "Base64",
  uuid: "a UUID",
};

type Panel =
  | { kind: "idle" }
  | { kind: "files"; files: File[]; dropped: DroppedFile[]; suggestions: FileSuggestions }
  | { kind: "paste"; text: string; options: { tool: HeroTool; detector: string }[] }
  | { kind: "opening"; name: string };

/** Stagger the first six items (design-system §7.3); the rest appear together. */
const staggerStyle = (index: number) =>
  ({ "--stagger-index": Math.min(index, 5) }) as CSSProperties;

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest("input, textarea, select") !== null)
  );
}

/**
 * The instrument hero (design-system §1, §10.1): one surface that is a tool
 * search, a drop zone for any file (G-2) and a paste target (G-3). Dropped
 * files and pasted text stay in memory and are handed to the chosen tool.
 * The static HTML already works: the "Choose files" label opens the native
 * picker, and files chosen before hydration are picked up on mount.
 */
export function InstrumentHero({ tools }: { tools: HeroTool[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [panel, setPanel] = useState<Panel>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const [fuse, setFuse] = useState<Fuse<HeroTool> | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const dragDepth = useRef(0);
  const ids = { search: useId(), list: useId(), file: useId(), hint: useId() };

  // Fuse.js loads on intent (focus or typing), not with the page.
  function loadSearch() {
    if (fuse) return;
    void import("fuse.js").then(({ default: FuseSearch }) =>
      setFuse(new FuseSearch(tools, SEARCH_OPTIONS)),
    );
  }

  const trimmed = query.trim();
  const results = trimmed && fuse ? searchTools(fuse, trimmed, 6) : [];
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function open(tool: HeroTool, payload?: Handoff) {
    if (payload) handOff(tool.slug, payload);
    setPanel({ kind: "opening", name: tool.name });
    router.push(`/${tool.slug}`);
  }

  async function receiveFiles(files: File[]) {
    if (files.length === 0) return;
    setQuery("");
    const dropped = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        kind: await sniffFile(file).catch(() => null),
      })),
    );
    setPanel({ kind: "files", files, dropped, suggestions: suggestForFiles(tools, dropped) });
  }

  /** True when the text was recognised (and so not pasted into the search field). */
  function receiveText(text: string): boolean {
    const suggestion = suggestForText(tools, text);
    if (suggestion.action === "open") {
      open(suggestion.tool, { text, source: suggestion.detector });
      return true;
    }
    if (suggestion.action === "choose") {
      setQuery("");
      setPanel({ kind: "paste", text, options: suggestion.options });
      return true;
    }
    return false;
  }

  // Paste and drop work anywhere on the homepage, not only on the surface.
  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length > 0) {
      event.preventDefault();
      void receiveFiles(files);
      return;
    }
    // Other fields (e.g. the command palette) keep their normal paste.
    if (isEditable(event.target) && event.target !== searchInput.current) return;
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text.trim() && receiveText(text)) event.preventDefault();
  });
  const onDrop = useEffectEvent((files: File[]) => void receiveFiles(files));
  useEffect(() => {
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const leave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      onDrop(Array.from(event.dataTransfer?.files ?? []));
    };
    const paste = (event: ClipboardEvent) => onPaste(event);
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    document.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      document.removeEventListener("paste", paste);
    };
  }, []);

  // Input from the static HTML before hydration fired no React event.
  const onEarlyInput = useEffectEvent(() => {
    const element = fileInput.current;
    if (element?.files?.length) {
      void receiveFiles(Array.from(element.files));
      element.value = "";
    }
    if (searchInput.current?.value) {
      setQuery(searchInput.current.value);
      loadSearch();
    }
  });
  useEffect(() => onEarlyInput(), []);

  // Suggestions replace what the user was doing; move focus to them so
  // keyboard and screen reader users land on the choice.
  useEffect(() => {
    if (panel.kind === "files" || panel.kind === "paste") panelHeading.current?.focus();
  }, [panel]);

  function reset() {
    setPanel({ kind: "idle" });
    searchInput.current?.focus();
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      const tool = results[activeIndex];
      if (tool) {
        event.preventDefault();
        open(tool);
      }
    } else if (event.key === "Escape" && query) {
      event.preventDefault();
      setQuery("");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        data-dragging={dragging || undefined}
        className={cn(
          "overflow-hidden rounded-xl border bg-surface shadow-1 transition-control",
          dragging ? "scale-101 border-accent bg-accent-soft" : "border-border-strong",
        )}
      >
        <div className="relative flex items-center">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 size-5 text-fg-muted md:left-5 md:size-6"
          />
          <label htmlFor={ids.search} className="sr-only">
            Search tools
          </label>
          <input
            ref={searchInput}
            id={ids.search}
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={ids.list}
            aria-autocomplete="list"
            aria-activedescendant={results.length > 0 ? `${ids.list}-${activeIndex}` : undefined}
            aria-describedby={ids.hint}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              if (panel.kind === "paste") setPanel({ kind: "idle" });
              loadSearch();
            }}
            onFocus={loadSearch}
            onKeyDown={onSearchKeyDown}
            placeholder={`Search ${tools.length} tools, or paste text…`}
            className="h-14 w-full bg-transparent pr-4 pl-12 text-body-lg text-fg outline-none placeholder:text-fg-subtle md:h-16 md:pl-14"
          />
        </div>
        {results.length > 0 && (
          <ul
            id={ids.list}
            role="listbox"
            aria-label="Matching tools"
            className="flex flex-col gap-0.5 border-t border-border p-2"
          >
            {results.map((tool, index) => (
              <li
                key={tool.slug}
                id={`${ids.list}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onPointerMove={() => setActive(index)}
                onClick={() => open(tool)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2",
                  index === activeIndex && "bg-surface-2",
                )}
              >
                <ToolIcon name={tool.icon} className="size-5 shrink-0 text-fg-muted" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-ui text-fg">{tool.name}</span>
                  <span className="truncate text-small text-fg-muted">{tool.tagline}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {trimmed && fuse && results.length === 0 && (
          <p className="border-t border-border px-5 py-4 text-small text-fg-muted">
            No tools match “{trimmed}”. Try “PDF”, “compress”, “HEIC” or “JSON”.
          </p>
        )}
        <div className="flex flex-col items-start gap-3 border-t border-dashed border-border-strong px-4 py-4 sm:flex-row sm:items-center md:px-5">
          <span
            aria-hidden
            className={cn(
              "hidden size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg-muted sm:inline-flex [&_svg]:size-5",
              dragging && "text-accent-text",
            )}
          >
            <FileUp />
          </span>
          <p id={ids.hint} className="flex grow flex-col gap-0.5">
            <span className="text-ui text-fg">
              {dragging
                ? "Drop to see which tools can open your files"
                : "Or drop files anywhere on this page"}
            </span>
            <span className="text-small text-fg-muted">
              PDFs, photos (JPG, PNG, WebP, HEIC), JSON, or any file to hash. Nothing is uploaded.
            </span>
          </p>
          <input
            ref={fileInput}
            id={ids.file}
            type="file"
            multiple
            className="peer sr-only"
            onChange={(event) => {
              void receiveFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <label
            htmlFor={ids.file}
            className={buttonClasses({
              variant: "secondary",
              className: "shrink-0 peer-focus-visible:focus-ring",
            })}
          >
            Choose files
          </label>
        </div>
      </div>
      {/* Focus moves to the suggestions; this announces navigation. */}
      <p role="status" className="sr-only">
        {panel.kind === "opening" ? `Opening ${panel.name}…` : ""}
      </p>
      <SuggestionPanel panel={panel} headingRef={panelHeading} onOpen={open} onReset={reset} />
    </div>
  );
}

function SuggestionPanel({
  panel,
  headingRef,
  onOpen,
  onReset,
}: {
  panel: Panel;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onOpen: (tool: HeroTool, payload?: Handoff) => void;
  onReset: () => void;
}) {
  if (panel.kind === "idle") return null;
  if (panel.kind === "opening") {
    return <p className="px-1 text-small text-fg-muted">Opening {panel.name}…</p>;
  }

  let heading: string;
  let detail: string;
  let message: string | null = null;
  let choices: { tool: HeroTool; note?: string; payload: Handoff }[];

  if (panel.kind === "files") {
    const { files, dropped, suggestions } = panel;
    const size = formatBytes(files.reduce((sum, file) => sum + file.size, 0));
    const single = files.length === 1 ? files[0]! : null;
    const kind = dropped[0]?.kind;
    heading = single ? `Open ${single.name} in` : `Open ${plural(files.length, "file")} in`;
    detail = single && kind ? `${capitalize(describeKind(kind))} · ${size}` : size;
    const payload = { files, source: "home" };
    if (suggestions.tools.length > 0) {
      choices = suggestions.tools.map((tool) => ({ tool, payload }));
    } else if (suggestions.anyFile.length > 0) {
      message =
        "No tool here converts this type of file. You can still check its hash or encode it.";
      choices = suggestions.anyFile.map((tool) => ({ tool, payload }));
    } else {
      heading = `No tool takes ${single ? "this file" : "these files together"}`;
      message = single
        ? "Sprigkit works with PDFs, images, JSON and text files."
        : "Drop PDFs and images separately, or choose fewer files.";
      choices = [];
    }
  } else {
    heading = "Open the pasted text in";
    detail = `${plural(panel.text.length, "character")} · kept in memory, never stored`;
    choices = panel.options.map(({ tool, detector }) => ({
      tool,
      note: `Looks like ${DETECTOR_LABELS[detector] ?? detector}`,
      payload: { text: panel.text, source: detector },
    }));
  }

  return (
    <section
      aria-labelledby="hero-suggestions"
      className="flex animate-rise-in flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            ref={headingRef}
            id="hero-suggestions"
            tabIndex={-1}
            className="text-h3 break-words text-fg outline-none focus-visible:focus-ring"
          >
            {heading}
          </h2>
          <p className="font-mono text-small text-fg-muted tabular-nums">{detail}</p>
        </div>
        <IconButton label="Clear" icon={<X aria-hidden />} size="sm" onClick={onReset} />
      </div>
      {message && <p className="text-small text-fg-muted">{message}</p>}
      {choices.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map(({ tool, note, payload }, index) => (
            <li key={tool.slug} className="stagger animate-rise-in" style={staggerStyle(index)}>
              <button
                type="button"
                onClick={() => onOpen(tool, payload)}
                className="group flex w-full items-center gap-3 rounded-md border border-border bg-surface p-3 text-left transition-control hover:border-border-strong hover:bg-surface-2"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted">
                  <ToolIcon name={tool.icon} className="size-5" />
                </span>
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-ui text-fg">{tool.name}</span>
                  <span className="truncate text-small text-fg-muted">{note ?? tool.tagline}</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 text-fg-muted transition-control group-hover:translate-x-0.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function capitalize(text: string): string {
  // "a PDF document" → "PDF document"
  const words = text.replace(/^an? /, "");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
