// Size arithmetic shared by the image tools. Pure.

export type Size = { width: number; height: number };

/**
 * Scales `size` down so its longest side is at most `max`, keeping the
 * aspect ratio (rounded to whole pixels, at least 1). Never enlarges.
 */
export function fitWithin(size: Size, max: number): Size {
  const longest = Math.max(size.width, size.height);
  if (!(max > 0) || longest <= max) return size;
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}
