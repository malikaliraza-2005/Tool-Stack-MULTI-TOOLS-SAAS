import { describe, expect, it } from "vitest";
import {
  clampRect,
  MIN_ITEM_SIZE,
  normalizeRotation,
  placement,
  rectToView,
  resizeRect,
  toUser,
  toView,
  viewSize,
  type PageBox,
} from "./geometry";

// A crop box that doesn't start at 0, 0, to catch missing offsets.
const box = (rotation: number): PageBox => ({ x: 10, y: 20, width: 600, height: 800, rotation });

describe("view ↔ user coordinates", () => {
  it("maps the view's top-left corner to the right corner for each rotation", () => {
    // As displayed, the top-left corner is the crop box's top-left (0°),
    // bottom-left (90°), bottom-right (180°) or top-right (270°).
    expect(toUser(box(0), 0, 0)).toEqual([10, 820]);
    expect(toUser(box(90), 0, 0)).toEqual([10, 20]);
    expect(toUser(box(180), 0, 0)).toEqual([610, 20]);
    expect(toUser(box(270), 0, 0)).toEqual([610, 820]);
  });

  it("round-trips any point", () => {
    for (const rotation of [0, 90, 180, 270]) {
      const page = box(rotation);
      const { width, height } = viewSize(page);
      for (const [vx, vy] of [
        [0, 0],
        [width, height],
        [123.5, 45.25],
      ] as const) {
        const [ux, uy] = toUser(page, vx, vy);
        const back = toView(page, ux, uy);
        expect(back[0]).toBeCloseTo(vx, 9);
        expect(back[1]).toBeCloseTo(vy, 9);
      }
    }
  });

  it("swaps the displayed size for quarter turns", () => {
    expect(viewSize(box(0))).toEqual({ width: 600, height: 800 });
    expect(viewSize(box(90))).toEqual({ width: 800, height: 600 });
    expect(viewSize(box(270))).toEqual({ width: 800, height: 600 });
  });

  it("normalizes /Rotate values", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(0)).toBe(0);
  });
});

describe("placement", () => {
  it("anchors at the item's on-screen bottom-left, rotated with the page", () => {
    const rect = { x: 100, y: 50, width: 200, height: 80 };
    expect(placement(box(0), rect)).toEqual({ x: 110, y: 690, rotate: 0 });
    expect(placement(box(90), rect)).toEqual({ x: 140, y: 120, rotate: 90 });
    expect(placement(box(180), rect)).toEqual({ x: 510, y: 150, rotate: 180 });
    expect(placement(box(270), rect)).toEqual({ x: 480, y: 720, rotate: 270 });
  });

  it("covers the same area as the view rectangle", () => {
    // The drawn image's corners, mapped back to the view, are the rect's corners.
    const rect = { x: 100, y: 50, width: 200, height: 80 };
    for (const rotation of [0, 90, 180, 270]) {
      const page = box(rotation);
      const { x, y, rotate } = placement(page, rect);
      const rad = (rotate * Math.PI) / 180;
      const corner = (dx: number, dy: number) =>
        toView(
          page,
          x + dx * Math.cos(rad) - dy * Math.sin(rad),
          y + dx * Math.sin(rad) + dy * Math.cos(rad),
        );
      const topRight = corner(rect.width, rect.height);
      expect(topRight[0]).toBeCloseTo(rect.x + rect.width, 9);
      expect(topRight[1]).toBeCloseTo(rect.y, 9);
    }
  });
});

describe("rects", () => {
  it("maps a widget rectangle into the view", () => {
    const widget = { x: 60, y: 720, width: 200, height: 20 };
    expect(rectToView(box(0), widget)).toEqual({ x: 50, y: 80, width: 200, height: 20 });
    expect(rectToView(box(90), widget)).toEqual({ x: 700, y: 50, width: 20, height: 200 });
  });

  it("keeps items on the page", () => {
    expect(clampRect({ x: -5, y: 790, width: 100, height: 50 }, 600, 800)).toEqual({
      x: 0,
      y: 750,
      width: 100,
      height: 50,
    });
  });

  it("resizes keeping the aspect ratio, within the page and a minimum size", () => {
    const rect = { x: 100, y: 100, width: 200, height: 50 };
    expect(resizeRect(rect, 400, 600, 800)).toEqual({ x: 100, y: 100, width: 400, height: 100 });
    // Limited by the right edge.
    expect(resizeRect(rect, 900, 600, 800).width).toBe(500);
    // Never thinner than the minimum.
    expect(resizeRect(rect, 1, 600, 800).height).toBe(MIN_ITEM_SIZE);
  });
});
