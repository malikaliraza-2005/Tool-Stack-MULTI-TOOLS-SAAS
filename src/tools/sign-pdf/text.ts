// Text rules shared by the page and the worker (tool-specifications §3.6).
// Pure: no DOM, no pdf-lib.

/** The 27 characters WinAnsi adds in 0x80–0x9F, beyond ASCII and Latin-1. */
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/**
 * Characters pdf-lib can write with the PDF standard fonts (Helvetica), which
 * use WinAnsi encoding: most Western European text. Anything else (Greek,
 * Cyrillic, CJK, emoji, ą, ő…) must be drawn as an image instead.
 */
export function unencodable(text: string): string[] {
  const found = new Set<string>();
  for (const char of text) {
    const code = char.codePointAt(0)!;
    const ok =
      (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(char);
    if (!ok) found.add(char);
  }
  return [...found];
}

/** Line box of a placed text item, as a multiple of its font size. */
export const TEXT_LINE_HEIGHT = 1.25;
/** Baseline height above the bottom of the line box, as a multiple of the font size. */
export const TEXT_BASELINE = 0.28;
/** Default size of placed text, in points. */
export const DEFAULT_FONT_SIZE = 14;

/** The checkmark: a path in a CHECK_VIEWBOX square, stroked CHECK_STROKE wide. */
export const CHECK_PATH = "M4 12.5 L9.5 18 L20 6";
export const CHECK_VIEWBOX = 24;
export const CHECK_STROKE = 2.8;
