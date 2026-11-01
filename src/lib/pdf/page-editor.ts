// The page list behind PageThumbnailGrid (tool-specifications §3.3): order,
// rotation and deletion of a PDF's pages, with undo/redo. Pure: no DOM.

export type PageEntry = {
  /** Stable id for keys, selection and focus. */
  id: string;
  /** 0-based page index in the source PDF. */
  source: number;
  /** Rotation added by the user, in degrees: 0, 90, 180 or 270. */
  rotation: number;
};

export type PageEditorState = {
  pages: PageEntry[];
  /** Earlier page lists, most recent last. */
  past: PageEntry[][];
  /** Undone page lists, most recent last. */
  future: PageEntry[][];
};

export type PageEdit =
  | { type: "rotate"; ids: readonly string[]; by: 90 | -90 | 180 }
  | { type: "remove"; ids: readonly string[] }
  /** Moves the pages (keeping their relative order) to `to`, an index in the list without them. */
  | { type: "move"; ids: readonly string[]; to: number };

/** Undo steps kept; older ones are dropped. */
export const HISTORY_LIMIT = 100;

export function createPageEditor(pageCount: number): PageEditorState {
  return {
    pages: Array.from({ length: pageCount }, (_, i) => ({
      id: `p${i + 1}`,
      source: i,
      rotation: 0,
    })),
    past: [],
    future: [],
  };
}

const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;

/** The page list after `edit`, or an explanation when the edit isn't allowed. */
export function editPages(
  pages: readonly PageEntry[],
  edit: PageEdit,
): { pages: PageEntry[] } | { error: string } {
  const ids = new Set(edit.ids);
  if (edit.type === "rotate") {
    return {
      pages: pages.map((page) =>
        ids.has(page.id) ? { ...page, rotation: normalize(page.rotation + edit.by) } : page,
      ),
    };
  }
  if (edit.type === "remove") {
    const kept = pages.filter((page) => !ids.has(page.id));
    if (kept.length === 0) {
      return {
        error:
          "A PDF needs at least one page, so every page can’t be deleted. Keep at least one page.",
      };
    }
    return { pages: kept };
  }
  const moving = pages.filter((page) => ids.has(page.id));
  const rest = pages.filter((page) => !ids.has(page.id));
  const to = Math.min(Math.max(edit.to, 0), rest.length);
  return { pages: [...rest.slice(0, to), ...moving, ...rest.slice(to)] };
}

const samePages = (a: readonly PageEntry[], b: readonly PageEntry[]) =>
  a.length === b.length &&
  a.every((page, i) => page.id === b[i]!.id && page.rotation === b[i]!.rotation);

/** Applies an edit and records it for undo. Edits that change nothing aren't recorded. */
export function applyEdit(
  state: PageEditorState,
  edit: PageEdit,
): { state: PageEditorState } | { error: string } {
  const result = editPages(state.pages, edit);
  if ("error" in result) return result;
  if (samePages(result.pages, state.pages)) return { state };
  return {
    state: {
      pages: result.pages,
      past: [...state.past, state.pages].slice(-HISTORY_LIMIT),
      future: [],
    },
  };
}

export function undo(state: PageEditorState): PageEditorState {
  const previous = state.past[state.past.length - 1];
  if (!previous) return state;
  return { pages: previous, past: state.past.slice(0, -1), future: [...state.future, state.pages] };
}

export function redo(state: PageEditorState): PageEditorState {
  const next = state.future[state.future.length - 1];
  if (!next) return state;
  return { pages: next, past: [...state.past, state.pages], future: state.future.slice(0, -1) };
}

/** What the output document should contain: source page and added rotation, in order. */
export function outputPlan(pages: readonly PageEntry[]): { source: number; rotation: number }[] {
  return pages.map(({ source, rotation }) => ({ source, rotation }));
}

/** True when the list differs from the original document. */
export function isEdited(pages: readonly PageEntry[], pageCount: number): boolean {
  return (
    pages.length !== pageCount || pages.some((page, i) => page.source !== i || page.rotation !== 0)
  );
}
