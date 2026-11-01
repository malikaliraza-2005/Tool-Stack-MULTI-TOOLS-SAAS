import { describe, expect, it } from "vitest";
import {
  applyEdit,
  createPageEditor,
  HISTORY_LIMIT,
  isEdited,
  outputPlan,
  redo,
  undo,
  type PageEdit,
  type PageEditorState,
} from "./page-editor";

function apply(state: PageEditorState, edit: PageEdit): PageEditorState {
  const result = applyEdit(state, edit);
  if ("error" in result) throw new Error(result.error);
  return result.state;
}

const order = (state: PageEditorState) => state.pages.map((page) => page.source + 1);

describe("page editor", () => {
  it("starts with every page in order, unrotated", () => {
    const state = createPageEditor(3);
    expect(state.pages).toEqual([
      { id: "p1", source: 0, rotation: 0 },
      { id: "p2", source: 1, rotation: 0 },
      { id: "p3", source: 2, rotation: 0 },
    ]);
    expect(isEdited(state.pages, 3)).toBe(false);
  });

  it("rotates pages in 90° steps, both ways", () => {
    let state = createPageEditor(3);
    state = apply(state, { type: "rotate", ids: ["p1", "p3"], by: 90 });
    state = apply(state, { type: "rotate", ids: ["p1"], by: -90 });
    state = apply(state, { type: "rotate", ids: ["p3"], by: 180 });
    state = apply(state, { type: "rotate", ids: ["p2"], by: -90 });
    expect(state.pages.map((page) => page.rotation)).toEqual([0, 270, 270]);
  });

  it("deletes pages but never all of them", () => {
    let state = createPageEditor(3);
    state = apply(state, { type: "remove", ids: ["p2"] });
    expect(order(state)).toEqual([1, 3]);
    const all = applyEdit(state, { type: "remove", ids: ["p1", "p3"] });
    expect(all).toEqual({ error: expect.stringMatching(/at least one page/) });
  });

  it("moves a block of pages, keeping their order", () => {
    const state = createPageEditor(6);
    // Move pages 2 and 4 to the end.
    expect(order(apply(state, { type: "move", ids: ["p2", "p4"], to: 4 }))).toEqual([
      1, 3, 5, 6, 2, 4,
    ]);
    // To the front.
    expect(order(apply(state, { type: "move", ids: ["p5"], to: 0 }))).toEqual([5, 1, 2, 3, 4, 6]);
    // Out-of-range targets are clamped.
    expect(order(apply(state, { type: "move", ids: ["p1"], to: 99 }))).toEqual([2, 3, 4, 5, 6, 1]);
  });

  it("undoes and redoes edits; a new edit clears redo", () => {
    let state = createPageEditor(4);
    state = apply(state, { type: "move", ids: ["p4"], to: 0 });
    state = apply(state, { type: "remove", ids: ["p2"] });
    expect(order(state)).toEqual([4, 1, 3]);
    state = undo(state);
    expect(order(state)).toEqual([4, 1, 2, 3]);
    state = undo(state);
    expect(order(state)).toEqual([1, 2, 3, 4]);
    expect(undo(state)).toBe(state);
    state = redo(state);
    expect(order(state)).toEqual([4, 1, 2, 3]);
    state = apply(state, { type: "rotate", ids: ["p1"], by: 90 });
    expect(state.future).toEqual([]);
    expect(redo(state)).toBe(state);
  });

  it("doesn't record edits that change nothing", () => {
    const state = createPageEditor(3);
    expect(apply(state, { type: "move", ids: ["p1"], to: 0 })).toBe(state);
    expect(apply(state, { type: "rotate", ids: [], by: 90 })).toBe(state);
  });

  it("keeps a bounded history", () => {
    let state = createPageEditor(2);
    for (let i = 0; i < HISTORY_LIMIT + 20; i++)
      state = apply(state, { type: "rotate", ids: ["p1"], by: 90 });
    expect(state.past).toHaveLength(HISTORY_LIMIT);
  });

  it("describes the output document", () => {
    let state = createPageEditor(3);
    state = apply(state, { type: "move", ids: ["p3"], to: 0 });
    state = apply(state, { type: "rotate", ids: ["p3"], by: 90 });
    state = apply(state, { type: "remove", ids: ["p2"] });
    expect(outputPlan(state.pages)).toEqual([
      { source: 2, rotation: 90 },
      { source: 0, rotation: 0 },
    ]);
    expect(isEdited(state.pages, 3)).toBe(true);
  });
});
