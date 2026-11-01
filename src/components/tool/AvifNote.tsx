import { Clock } from "lucide-react";

/** Total megapixels above which the note adds the batch size. */
const MENTION_ABOVE_MP = 4;

/**
 * Shown when AVIF output is chosen (P6-T10): AVIF encoding is several times
 * slower than WebP. Measured 2026-11-01: a 12 MP photo took about 30 s to
 * AVIF and 5 s to WebP in desktop Chromium; phones are slower still, so they
 * use a faster encoder setting.
 */
export function AvifNote({ megapixels }: { megapixels: number }) {
  return (
    <p className="-mt-2 flex items-start gap-1.5 text-small text-fg-muted">
      <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>
        AVIF is the smallest format but slow to create: about 30 seconds per 12-megapixel photo on a
        fast computer, and longer on a phone. WebP is about six times faster.
        {megapixels > MENTION_ABOVE_MP &&
          ` These images total ${Math.round(megapixels)} megapixels.`}
      </span>
    </p>
  );
}

/** Total megapixels of the images that will become AVIF. */
export function avifMegapixels(images: readonly { width: number; height: number }[]): number {
  return images.reduce((sum, image) => sum + (image.width * image.height) / 1e6, 0);
}
