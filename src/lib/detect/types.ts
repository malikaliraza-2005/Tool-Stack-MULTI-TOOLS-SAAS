// Smart-paste detectors (tool-registry §5): fast (≤ 1 ms on 10 KB), side-effect
// free, and never send data anywhere.

export type Detector = {
  id: string;
  /** Confidence from 0 (no match) to 1 (certain). */
  detect(text: string): number;
};
