// Coordinates for Sign PDF (tool-specifications §3.6). Pure: no DOM, no
// pdf-lib, so it is fully unit-tested.
//
// Placed items are kept in *view* coordinates: points, origin at the top-left
// of the page as displayed (after the page's own /Rotate), y downwards, like
// the preview. PDF *user* space has its origin at the bottom-left of the
// unrotated crop box, y upwards. These functions convert between the two.

/** A page's crop box in user space and its /Rotate (0, 90, 180 or 270). */
export type PageBox = { x: number; y: number; width: number; height: number; rotation: number };

export type Rect = { x: number; y: number; width: number; height: number };

/** /Rotate normalised to 0, 90, 180 or 270. */
export function normalizeRotation(angle: number): number {
  return ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270;
}

/** Size of the page as displayed, in points. */
export function viewSize(box: PageBox): { width: number; height: number } {
  const turned = box.rotation === 90 || box.rotation === 270;
  return turned
    ? { width: box.height, height: box.width }
    : { width: box.width, height: box.height };
}

/** A view point (top-left origin, y down) in user space. */
export function toUser(box: PageBox, vx: number, vy: number): [number, number] {
  const { x, y, width: w, height: h } = box;
  switch (box.rotation) {
    case 90:
      return [x + vy, y + vx];
    case 180:
      return [x + w - vx, y + vy];
    case 270:
      return [x + w - vy, y + h - vx];
    default:
      return [x + vx, y + h - vy];
  }
}

/** A user-space point as a view point. */
export function toView(box: PageBox, ux: number, uy: number): [number, number] {
  const { x, y, width: w, height: h } = box;
  switch (box.rotation) {
    case 90:
      return [uy - y, ux - x];
    case 180:
      return [x + w - ux, uy - y];
    case 270:
      return [y + h - uy, x + w - ux];
    default:
      return [ux - x, y + h - uy];
  }
}

/**
 * Where to draw an upright item that occupies `rect` in the view: the anchor
 * is the item's bottom-left corner as seen on screen, in user space, and the
 * item is rotated counter-clockwise by the page's rotation so it appears
 * upright (pdf-lib's `x`, `y` and `rotate` options).
 */
export function placement(box: PageBox, rect: Rect): { x: number; y: number; rotate: number } {
  const [x, y] = toUser(box, rect.x, rect.y + rect.height);
  return { x, y, rotate: box.rotation };
}

/** A user-space rectangle (e.g. a form field's widget) as a view rectangle. */
export function rectToView(box: PageBox, rect: Rect): Rect {
  const [ax, ay] = toView(box, rect.x, rect.y);
  const [bx, by] = toView(box, rect.x + rect.width, rect.y + rect.height);
  return {
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  };
}

/** Keeps `rect` inside a page of `width` × `height` points (moving it, not resizing). */
export function clampRect(rect: Rect, width: number, height: number): Rect {
  return {
    ...rect,
    x: Math.min(Math.max(0, rect.x), Math.max(0, width - rect.width)),
    y: Math.min(Math.max(0, rect.y), Math.max(0, height - rect.height)),
  };
}

/** Smallest size an item can be resized to, in points (its shorter side). */
export const MIN_ITEM_SIZE = 8;

/**
 * `rect` resized to `width`, keeping its aspect ratio and top-left corner, so
 * that it stays within the page and no side is shorter than MIN_ITEM_SIZE.
 */
export function resizeRect(rect: Rect, width: number, pageWidth: number, pageHeight: number): Rect {
  const ratio = rect.height / rect.width;
  const min = MIN_ITEM_SIZE * Math.max(1, 1 / ratio);
  const max = Math.min(pageWidth - rect.x, (pageHeight - rect.y) / ratio);
  const next = Math.max(Math.min(min, max), Math.min(width, max));
  return { ...rect, width: next, height: next * ratio };
}
