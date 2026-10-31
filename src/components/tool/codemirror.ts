// CodeMirror 6 setup, loaded on demand by CodeEditor (its own chunk, never in
// the initial page bundle). Themed with design tokens only (design-system §8).

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  Annotation,
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
  type DecorationSet,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

const theme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--fg)",
    backgroundColor: "var(--surface)",
    fontSize: "var(--text-code)",
  },
  "&.cm-focused": {
    outline: "var(--focus-ring-width) solid var(--focus-ring)",
    outlineOffset: "calc(var(--focus-ring-width) * -1)",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "var(--text-code--line-height)",
  },
  ".cm-content": { caretColor: "var(--fg)", paddingBlock: "calc(var(--spacing) * 3)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
    { backgroundColor: "var(--accent-soft)" },
  ".cm-gutters": {
    backgroundColor: "var(--surface)",
    color: "var(--fg-subtle)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine": { backgroundColor: "var(--surface-2)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--surface-2)", color: "var(--fg-muted)" },
  ".cm-placeholder": { color: "var(--fg-subtle)" },
  ".cm-matchingBracket": {
    backgroundColor: "var(--accent-soft)",
    outline: "1px solid var(--border-strong)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--fg-muted)",
  },
  ".cm-error-line": { backgroundColor: "var(--danger-soft)" },
  ".cm-error-line-gutter": { backgroundColor: "var(--danger-soft)", color: "var(--danger)" },
});

// Colors from the tested token pairs (text on --surface, design-system §2.3);
// syntax is never the only signal, the text itself is unchanged.
const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--accent-text)" },
  { tag: tags.string, color: "var(--success)" },
  { tag: tags.number, color: "var(--info)" },
  { tag: [tags.bool, tags.null], color: "var(--warning)" },
  {
    tag: [tags.punctuation, tags.separator, tags.brace, tags.squareBracket],
    color: "var(--fg-muted)",
  },
  { tag: tags.comment, color: "var(--fg-subtle)", fontStyle: "italic" },
]);

const setErrorLine = StateEffect.define<number | null>();

/** Marks changes made through setValue, which the owner already knows about. */
const external = Annotation.define<boolean>();

/** Highlights the line containing the error offset (tool-specifications §5.1). */
const errorLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setErrorLine)) continue;
      if (effect.value === null) next = Decoration.none;
      else {
        const offset = Math.min(effect.value, transaction.state.doc.length);
        const line = transaction.state.doc.lineAt(offset);
        next = Decoration.set([Decoration.line({ class: "cm-error-line" }).range(line.from)]);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export type EditorOptions = {
  parent: HTMLElement;
  doc: string;
  label: string;
  readOnly: boolean;
  language: "json" | "text";
  wrap?: boolean;
  placeholder?: string;
  describedBy?: string;
  onChange?: (value: string) => void;
};

export type EditorController = {
  view: EditorView;
  setValue(value: string): void;
  setErrorOffset(offset: number | null): void;
  focusAt(offset: number): void;
  focus(selection?: { anchor: number; head: number }): void;
  destroy(): void;
};

export function createEditor(options: EditorOptions): EditorController {
  const { parent, doc, label, readOnly, language, onChange } = options;
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        // Tab is not bound, so keyboard users can always Tab out of the editor.
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
        language === "json" ? json() : [],
        options.wrap ? EditorView.lineWrapping : [],
        syntaxHighlighting(highlight),
        theme,
        errorLine,
        options.placeholder ? placeholderExtension(options.placeholder) : [],
        EditorState.readOnly.of(readOnly),
        EditorView.contentAttributes.of({
          "aria-label": label,
          // Explicit, so the scroll container counts as keyboard accessible (axe).
          tabindex: "0",
          ...(readOnly ? { "aria-readonly": "true" } : {}),
          ...(options.describedBy ? { "aria-describedby": options.describedBy } : {}),
          spellcheck: "false",
          autocorrect: "off",
          autocapitalize: "off",
        }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || !onChange) return;
          // Skip echoes of setValue: serializing a large document is costly.
          if (update.transactions.every((tr) => tr.annotation(external))) return;
          onChange(update.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    view,
    setValue(value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        selection: EditorSelection.cursor(0),
        effects: setErrorLine.of(null),
        annotations: external.of(true),
      });
    },
    setErrorOffset(offset) {
      view.dispatch({ effects: setErrorLine.of(offset) });
    },
    focusAt(offset) {
      const position = Math.min(offset, view.state.doc.length);
      view.dispatch({ selection: EditorSelection.cursor(position), scrollIntoView: true });
      view.focus();
    },
    focus(selection) {
      if (selection) {
        const max = view.state.doc.length;
        view.dispatch({
          selection: EditorSelection.range(
            Math.min(selection.anchor, max),
            Math.min(selection.head, max),
          ),
        });
      }
      view.focus();
    },
    destroy: () => view.destroy(),
  };
}
