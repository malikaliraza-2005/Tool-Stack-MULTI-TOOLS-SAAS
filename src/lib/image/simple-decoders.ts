// Decoders for GIF (first frame) and BMP, for browsers whose workers have no
// OffscreenCanvas to read decoded pixels (older Safari). Pure: bytes in,
// RGBA out, so they also run in unit tests.

import { createPixels, type Pixels } from "./pixels";

function corrupt(): Error {
  return new Error("The image data is damaged");
}

/** The first frame of a GIF on its logical screen; transparent where the frame doesn't draw. */
export function decodeGif(bytes: Uint8Array): Pixels {
  const u16 = (at: number) => bytes[at]! | (bytes[at + 1]! << 8);
  if (bytes.length < 13) throw corrupt();
  const width = u16(6);
  const height = u16(8);
  if (width < 1 || height < 1) throw corrupt();
  let offset = 13;
  let palette: Uint8Array | null = null;
  if (bytes[10]! & 0x80) {
    const size = 3 * 2 ** ((bytes[10]! & 7) + 1);
    palette = bytes.subarray(offset, offset + size);
    offset += size;
  }
  let transparentIndex = -1;
  const skipSubBlocks = (at: number) => {
    while (at < bytes.length && bytes[at] !== 0) at += bytes[at]! + 1;
    return at + 1;
  };

  while (offset < bytes.length) {
    const block = bytes[offset];
    if (block === 0x21) {
      if (bytes[offset + 1] === 0xf9 && bytes[offset + 2] === 4) {
        transparentIndex = bytes[offset + 3]! & 1 ? bytes[offset + 6]! : -1;
      }
      offset = skipSubBlocks(offset + 2);
      continue;
    }
    if (block !== 0x2c) throw corrupt(); // trailer or garbage before any image

    const left = u16(offset + 1);
    const top = u16(offset + 3);
    const frameWidth = u16(offset + 5);
    const frameHeight = u16(offset + 7);
    const packed = bytes[offset + 9]!;
    offset += 10;
    if (packed & 0x80) {
      const size = 3 * 2 ** ((packed & 7) + 1);
      palette = bytes.subarray(offset, offset + size);
      offset += size;
    }
    if (!palette) throw corrupt();
    const interlaced = (packed & 0x40) !== 0;

    // Gather the LZW data sub-blocks.
    const minCodeSize = bytes[offset++]!;
    const chunks: Uint8Array[] = [];
    while (offset < bytes.length && bytes[offset] !== 0) {
      const size = bytes[offset]!;
      chunks.push(bytes.subarray(offset + 1, offset + 1 + size));
      offset += size + 1;
    }
    const data = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
    let at = 0;
    for (const chunk of chunks) {
      data.set(chunk, at);
      at += chunk.length;
    }
    const indices = lzwDecode(data, minCodeSize, frameWidth * frameHeight);

    const out = createPixels(width, height);
    const rowOrder = interlaced ? interlacedRows(frameHeight) : null;
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i]!;
      if (index === transparentIndex) continue;
      const fx = i % frameWidth;
      const fyStored = Math.floor(i / frameWidth);
      const fy = rowOrder ? rowOrder[fyStored]! : fyStored;
      const x = left + fx;
      const y = top + fy;
      if (x >= width || y >= height) continue;
      const p = (y * width + x) * 4;
      out.data[p] = palette[index * 3] ?? 0;
      out.data[p + 1] = palette[index * 3 + 1] ?? 0;
      out.data[p + 2] = palette[index * 3 + 2] ?? 0;
      out.data[p + 3] = 255;
    }
    return out;
  }
  throw corrupt();
}

/** Stored row → displayed row for GIF interlacing (passes of 8, 8, 4, 2). */
function interlacedRows(height: number): number[] {
  const rows: number[] = [];
  for (const [start, step] of [
    [0, 8],
    [4, 8],
    [2, 4],
    [1, 2],
  ] as const) {
    for (let y = start; y < height; y += step) rows.push(y);
  }
  return rows;
}

function lzwDecode(data: Uint8Array, minCodeSize: number, pixelCount: number): Uint8Array {
  if (minCodeSize < 2 || minCodeSize > 8) throw corrupt();
  const out = new Uint8Array(pixelCount);
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  // Each table entry: prefix code and last byte.
  const prefix = new Int32Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);
  let codeSize = minCodeSize + 1;
  let next = end + 1;
  let previous = -1;
  let written = 0;
  let bits = 0;
  let bitCount = 0;
  let pos = 0;
  for (let i = 0; i < clear; i++) {
    prefix[i] = -1;
    suffix[i] = i;
  }

  while (written < pixelCount) {
    while (bitCount < codeSize) {
      if (pos >= data.length) return out; // truncated: keep what was decoded
      bits |= data[pos++]! << bitCount;
      bitCount += 8;
    }
    const code = bits & ((1 << codeSize) - 1);
    bits >>>= codeSize;
    bitCount -= codeSize;

    if (code === clear) {
      codeSize = minCodeSize + 1;
      next = end + 1;
      previous = -1;
      continue;
    }
    if (code === end) break;

    let current = code;
    if (code >= next) {
      // The KwKwK case: the code being defined right now.
      if (previous < 0 || code > next) throw corrupt();
      current = previous;
    }
    // Unwind the entry onto the stack.
    let top = 0;
    let walk = current;
    while (walk >= 0) {
      stack[top++] = suffix[walk]!;
      walk = prefix[walk]!;
    }
    const first = stack[top - 1]!;
    for (let i = top - 1; i >= 0 && written < pixelCount; i--) out[written++] = stack[i]!;
    if (code >= next && written < pixelCount) out[written++] = first;

    if (previous >= 0 && next < 4096) {
      prefix[next] = previous;
      suffix[next] = first;
      next++;
      if (next === 1 << codeSize && codeSize < 12) codeSize++;
    }
    previous = code;
  }
  return out;
}

/** Uncompressed BMP: 1/4/8-bit palette, 16/24/32-bit (BI_RGB or BI_BITFIELDS). */
export function decodeBmp(bytes: Uint8Array): Pixels {
  if (bytes.length < 30) throw corrupt();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataOffset = view.getUint32(10, true);
  const headerSize = view.getUint32(14, true);
  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  const bpp = view.getUint16(28, true);
  const compression = headerSize >= 20 ? view.getUint32(30, true) : 0;
  const height = Math.abs(rawHeight);
  const topDown = rawHeight < 0;
  if (width < 1 || height < 1) throw corrupt();
  if (compression !== 0 && compression !== 3) throw new Error("Compressed BMP is not supported");

  // Channel masks: BI_BITFIELDS stores them after the header (or inside V4/V5 headers).
  let masks = bpp === 16 ? [0x7c00, 0x03e0, 0x001f, 0] : [0xff0000, 0xff00, 0xff, 0xff000000];
  if (compression === 3) {
    const at = 14 + (headerSize >= 52 ? 40 : headerSize);
    masks = [0, 1, 2, 3].map((i) =>
      at + i * 4 + 4 <= bytes.length ? view.getUint32(at + i * 4, true) : 0,
    );
    if (headerSize < 56) masks[3] = 0;
  }
  const channel = (value: number, mask: number) => {
    if (!mask) return 255;
    const shift = Math.log2(mask & -mask);
    const max = mask >>> shift;
    return Math.round((((value & mask) >>> shift) * 255) / max);
  };

  const paletteAt = 14 + headerSize;
  const colors = bpp <= 8 ? (headerSize >= 36 && view.getUint32(46, true)) || 2 ** bpp : 0;
  const rowSize = Math.ceil((bpp * width) / 32) * 4;
  if (dataOffset + rowSize * height > bytes.length) throw corrupt();
  const out = createPixels(width, height);
  // 32-bit BI_RGB files usually leave the 4th byte at 0: all zero means no alpha.
  let allZero = true;

  for (let row = 0; row < height; row++) {
    const y = topDown ? row : height - 1 - row;
    const start = dataOffset + row * rowSize;
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (bpp <= 8) {
        const bit = x * bpp;
        const byte = bytes[start + (bit >> 3)]!;
        const index = (byte >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1);
        if (index >= colors) continue;
        const c = paletteAt + index * 4;
        out.data[p] = bytes[c + 2]!;
        out.data[p + 1] = bytes[c + 1]!;
        out.data[p + 2] = bytes[c]!;
        out.data[p + 3] = 255;
      } else if (bpp === 24) {
        const c = start + x * 3;
        out.data[p] = bytes[c + 2]!;
        out.data[p + 1] = bytes[c + 1]!;
        out.data[p + 2] = bytes[c]!;
        out.data[p + 3] = 255;
      } else if (bpp === 16 || bpp === 32) {
        const value =
          bpp === 16 ? view.getUint16(start + x * 2, true) : view.getUint32(start + x * 4, true);
        out.data[p] = channel(value, masks[0]!);
        out.data[p + 1] = channel(value, masks[1]!);
        out.data[p + 2] = channel(value, masks[2]!);
        const alpha = bpp === 32 && masks[3] ? channel(value, masks[3]) : 255;
        out.data[p + 3] = alpha;
        if (alpha !== 0) allZero = false;
      } else {
        throw new Error(`${bpp}-bit BMP is not supported`);
      }
    }
  }
  if (bpp === 32 && allZero) {
    for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255;
  }
  return out;
}
