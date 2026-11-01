// Pixel operations of the image pipeline (P6-T01): orientation, crop, alpha.
// Pure functions on RGBA buffers, so they run in the worker and in unit tests.

/** RGBA, 8 bits per channel, row by row: the shape of `ImageData`. */
export type Pixels = { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number };

export type Rect = { x: number; y: number; width: number; height: number };

export type Rgb = [number, number, number];

/** A blank image of the given size. */
export function createPixels(width: number, height: number): Pixels {
  return { data: new Uint8ClampedArray(width * height * 4), width, height };
}

/**
 * Turns pixels stored with EXIF `orientation` (1–8) upright. Orientations
 * 5–8 swap width and height.
 */
export function orient(source: Pixels, orientation: number): Pixels {
  if (orientation < 2 || orientation > 8) return source;
  const { width: w, height: h, data } = source;
  const swap = orientation >= 5;
  const out = createPixels(swap ? h : w, swap ? w : h);
  const src = new Uint32Array(data.buffer, data.byteOffset, w * h);
  const dst = new Uint32Array(out.data.buffer);
  const ow = out.width;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx: number;
      let dy: number;
      switch (orientation) {
        case 2:
          dx = w - 1 - x;
          dy = y;
          break; // mirror horizontal
        case 3:
          dx = w - 1 - x;
          dy = h - 1 - y;
          break; // rotate 180
        case 4:
          dx = x;
          dy = h - 1 - y;
          break; // mirror vertical
        case 5:
          dx = y;
          dy = x;
          break; // transpose
        case 6:
          dx = h - 1 - y;
          dy = x;
          break; // rotate 90 clockwise
        case 7:
          dx = h - 1 - y;
          dy = w - 1 - x;
          break; // transverse
        default:
          dx = y;
          dy = w - 1 - x;
          break; // 8: rotate 270 clockwise
      }
      dst[dy * ow + dx] = src[y * w + x]!;
    }
  }
  return out;
}

/** Clamps a crop rectangle to whole pixels inside the image (at least 1 × 1). */
export function clampRect(rect: Rect, width: number, height: number): Rect {
  const x = Math.min(Math.max(0, Math.round(rect.x)), width - 1);
  const y = Math.min(Math.max(0, Math.round(rect.y)), height - 1);
  return {
    x,
    y,
    width: Math.min(Math.max(1, Math.round(rect.width)), width - x),
    height: Math.min(Math.max(1, Math.round(rect.height)), height - y),
  };
}

export function crop(source: Pixels, rect: Rect): Pixels {
  const r = clampRect(rect, source.width, source.height);
  if (r.x === 0 && r.y === 0 && r.width === source.width && r.height === source.height) {
    return source;
  }
  const out = createPixels(r.width, r.height);
  for (let row = 0; row < r.height; row++) {
    const start = ((r.y + row) * source.width + r.x) * 4;
    out.data.set(source.data.subarray(start, start + r.width * 4), row * r.width * 4);
  }
  return out;
}

/** True when any pixel is not fully opaque. */
export function hasTransparency(pixels: Pixels): boolean {
  const { data } = pixels;
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) return true;
  return false;
}

/** Composites the image onto a solid background (for formats without alpha, e.g. JPG). */
export function flatten(source: Pixels, [r, g, b]: Rgb): Pixels {
  const out = createPixels(source.width, source.height);
  const s = source.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const a = s[i + 3]! / 255;
    d[i] = s[i]! * a + r * (1 - a);
    d[i + 1] = s[i + 1]! * a + g * (1 - a);
    d[i + 2] = s[i + 2]! * a + b * (1 - a);
    d[i + 3] = 255;
  }
  return out;
}

/** "#ffffff" → [255, 255, 255]; null when it isn't a 6-digit hex colour. */
export function parseHexColor(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1]!, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
