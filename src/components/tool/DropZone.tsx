"use client";

import { FileUp, Plus } from "lucide-react";
import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type DropZoneHandle = { focus(): void; open(): void };

type DropZoneProps = {
  accept: { mime: string[]; extensions: string[] };
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  /** "lg": the empty workspace. "sm": a compact bar for adding more files. */
  size?: "lg" | "sm";
  title: string;
  description: string;
  /** Formats and limits, e.g. "PDF · up to 500 MB in total". */
  hint?: string;
  buttonLabel?: string;
  /** Short name of the accepted type for the drag-over warning, e.g. "PDF files". */
  acceptLabel: string;
  disabled?: boolean;
  ref?: Ref<DropZoneHandle>;
};

type DragState = "idle" | "valid" | "invalid";

function matchesAccept(type: string, accept: DropZoneProps["accept"]): boolean | undefined {
  // Browsers often report an empty type while dragging; the files are then
  // checked by magic bytes after the drop (tool-specifications §2.1).
  if (!type) return undefined;
  return accept.mime.includes(type);
}

/**
 * File input for file tools (design-system §8): drag and drop, a "Choose
 * files" button for keyboard and screen-reader users, and paste (Ctrl+V)
 * of files. Types are checked again by magic bytes after selection.
 */
export function DropZone({
  accept,
  multiple = true,
  onFiles,
  size = "lg",
  title,
  description,
  hint,
  buttonLabel = "Choose files",
  acceptLabel,
  disabled = false,
  ref,
}: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const depth = useRef(0);
  const [drag, setDrag] = useState<DragState>("idle");

  useImperativeHandle(ref, () => ({
    focus: () => button.current?.focus(),
    open: () => input.current?.click(),
  }));

  function deliver(files: File[]) {
    if (!disabled && files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }
  const onPastedFiles = useEffectEvent(deliver);

  // Files chosen in the static HTML before the page hydrated fired no React
  // event; pick them up now (slow devices, WebKit).
  const onEarlyFiles = useEffectEvent(deliver);
  useEffect(() => {
    const element = input.current;
    if (element?.files?.length) {
      onEarlyFiles(Array.from(element.files));
      element.value = "";
    }
  }, []);

  // Paste files from the clipboard anywhere on the page, and stop the browser
  // from opening files dropped outside the zone (which would leave the tool).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      onPastedFiles(files);
    };
    const onWindowDrag = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    document.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onWindowDrag);
    window.addEventListener("drop", onWindowDrag);
    return () => {
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onWindowDrag);
      window.removeEventListener("drop", onWindowDrag);
    };
  }, []);

  const dragStateOf = (event: React.DragEvent): DragState => {
    const items = Array.from(event.dataTransfer.items).filter((item) => item.kind === "file");
    if (items.length === 0) return "invalid";
    return items.some((item) => matchesAccept(item.type, accept) === false) ? "invalid" : "valid";
  };

  const accepted = [...accept.mime, ...accept.extensions].join(",");
  const large = size === "lg";

  return (
    <div
      onDragEnter={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        depth.current += 1;
        setDrag(dragStateOf(event));
      }}
      onDragOver={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDrag("idle");
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDrag("idle");
        deliver(Array.from(event.dataTransfer.files));
      }}
      data-state={drag}
      className={cn(
        "flex rounded-lg border border-dashed transition-control",
        large
          ? "flex-col items-center justify-center gap-4 px-6 py-12 text-center md:py-16"
          : "flex-col items-start gap-3 p-4 sm:flex-row sm:items-center",
        drag === "idle" && "border-border-strong bg-surface-2",
        drag === "valid" && "scale-101 border-accent bg-accent-soft",
        drag === "invalid" && "border-danger bg-danger-soft",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg-muted",
          large ? "size-12 [&_svg]:size-6" : "size-10 [&_svg]:size-5",
          drag === "valid" && "text-accent-text",
          drag === "invalid" && "text-danger",
        )}
      >
        {large ? <FileUp /> : <Plus />}
      </span>
      <div className={cn("flex flex-col gap-1", !large && "grow")}>
        <p className={cn("text-fg", large ? "text-h3" : "text-ui")}>
          {drag === "invalid" ? `Only ${acceptLabel} can be added here` : title}
        </p>
        <p className="max-w-prose text-small text-fg-muted">{description}</p>
        {hint && large && <p className="font-mono text-small text-fg-muted tabular-nums">{hint}</p>}
      </div>
      <Button
        ref={button}
        variant={large ? "primary" : "secondary"}
        size={large ? "lg" : "md"}
        onClick={() => input.current?.click()}
        disabled={disabled}
      >
        {buttonLabel}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accepted}
        multiple={multiple}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          deliver(Array.from(event.target.files ?? []));
          // Allow choosing the same file again.
          event.target.value = "";
        }}
      />
    </div>
  );
}
