"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { cn } from "@/lib/cn";
import type { EditorController } from "./codemirror";

export type CodeEditorHandle = {
  /** Moves the cursor to a character offset and focuses the editor. */
  focusAt(offset: number): void;
  focus(): void;
};

type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  /** Accessible name of the text area. */
  label: string;
  readOnly?: boolean;
  language?: "json" | "text";
  /** Soft-wraps long lines (e.g. Base64) instead of scrolling sideways. */
  wrap?: boolean;
  placeholder?: string;
  /** Highlights the line containing this character offset (errors). */
  errorOffset?: number | null;
  /** Id of an element describing the content, e.g. an error message. */
  describedBy?: string;
  invalid?: boolean;
  ref?: Ref<CodeEditorHandle>;
  className?: string;
};

type CodeMirrorModule = typeof import("./codemirror");

// Once loaded, editors mounted later (e.g. the output after the first result)
// start as CodeMirror right away instead of passing through the textarea.
let loadedModule: CodeMirrorModule | null = null;
const loadCodeMirror = () =>
  import("./codemirror").then((mod) => {
    loadedModule = mod;
    return mod;
  });

/** The textarea fallback lays out all of its text; above this size it shows a placeholder. */
const FALLBACK_TEXT_LIMIT = 256 * 1024;

/**
 * Code editor (design-system §8). Renders a plain textarea first, which works
 * before any script loads, then upgrades to CodeMirror 6 on intent (hover,
 * focus or content), keeping the text, selection and focus. The box keeps its
 * size, so nothing shifts (architecture §7).
 */
export function CodeEditor({
  value,
  onChange,
  label,
  readOnly = false,
  language = "json",
  wrap = false,
  placeholder,
  errorOffset = null,
  describedBy,
  invalid = false,
  ref,
  className,
}: CodeEditorProps) {
  // Editors present at hydration start as the textarea, like the static HTML.
  const [module, setModule] = useState<CodeMirrorModule | null>(loadedModule);
  const host = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const editor = useRef<EditorController | null>(null);
  // The last value the editor reported, so echoes of our own changes are skipped.
  const emitted = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Load CodeMirror on intent (architecture §8.2): hover or focus, or as soon
  // as there is content to show (sample, opened file, output).
  const requested = useRef(false);
  // Focus and selection of the textarea, read just before it is removed: by
  // the time the swap effect runs, the textarea is gone and focus is on <body>.
  const handover = useRef<{ focused: boolean; anchor: number; head: number } | null>(null);
  const request = () => {
    if (requested.current) return;
    requested.current = true;
    void loadCodeMirror().then((mod) => {
      const area = textarea.current;
      handover.current = area && {
        focused: document.activeElement === area,
        anchor: area.selectionStart,
        head: area.selectionEnd,
      };
      setModule(mod);
    });
  };
  const hasContent = value !== "";
  useEffect(() => {
    if (hasContent) request();
  }, [hasContent]);

  // Swap the textarea for CodeMirror, carrying over text, selection and focus.
  useEffect(() => {
    if (!module || !host.current) return;
    const previous = handover.current;
    handover.current = null;
    const controller = module.createEditor({
      parent: host.current,
      doc: emitted.current,
      label,
      readOnly,
      language,
      wrap,
      placeholder,
      describedBy,
      onChange: (next) => {
        emitted.current = next;
        onChangeRef.current?.(next);
      },
    });
    editor.current = controller;
    if (previous?.focused) controller.focus({ anchor: previous.anchor, head: previous.head });
    return () => {
      controller.destroy();
      editor.current = null;
    };
    // The editor is created once per module load; props are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  // External value changes (sample, clear, new output).
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    editor.current?.setValue(value);
  }, [value]);

  useEffect(() => {
    editor.current?.setErrorOffset(errorOffset);
  }, [errorOffset, module]);

  useImperativeHandle(ref, () => ({
    focusAt(offset) {
      if (editor.current) editor.current.focusAt(offset);
      else if (textarea.current) {
        textarea.current.focus();
        textarea.current.setSelectionRange(offset, offset);
      }
    },
    focus() {
      (editor.current?.view ?? textarea.current)?.focus();
    },
  }));

  return (
    <div
      className={cn("relative h-full min-h-0", className)}
      data-invalid={invalid || undefined}
      onPointerEnter={request}
    >
      <div ref={host} className={cn("h-full", !module && "hidden")} />
      {!module && (
        <textarea
          ref={textarea}
          value={value.length > FALLBACK_TEXT_LIMIT ? "" : value}
          onChange={(event) => {
            emitted.current = event.target.value;
            onChange?.(event.target.value);
          }}
          onFocus={request}
          readOnly={readOnly || value.length > FALLBACK_TEXT_LIMIT}
          aria-label={label}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          placeholder={value.length > FALLBACK_TEXT_LIMIT ? "Loading the editor…" : placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap={wrap ? "soft" : "off"}
          className="block size-full resize-none bg-surface px-4 py-3 font-mono text-code text-fg placeholder:text-fg-subtle"
        />
      )}
    </div>
  );
}
