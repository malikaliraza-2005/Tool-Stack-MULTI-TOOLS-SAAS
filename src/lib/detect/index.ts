// Detector registry. Other detectors are added with their tools (Phase 4);
// smart paste on the homepage uses them in Phase 7.

import { base64Detector } from "./base64";
import { jsonDetector } from "./json";
import type { Detector } from "./types";
import { unixTimestampDetector } from "./unix-timestamp";
import { urlDetector, urlEncodedDetector } from "./url";

export type { Detector } from "./types";

export const DETECTORS: readonly Detector[] = [
  jsonDetector,
  unixTimestampDetector,
  base64Detector,
  urlDetector,
  urlEncodedDetector,
];

/** Tie-break order (tool-registry §5). Ids not listed rank last. */
export const DETECTOR_PRECEDENCE = [
  "jwt",
  "json",
  "url",
  "url-encoded",
  "unix-timestamp",
  "uuid",
  "base64",
] as const;

export function detectorIds(): string[] {
  return DETECTORS.map((detector) => detector.id);
}

export type DetectorMatch = { id: string; confidence: number };

/** Runs every detector; matches sorted by confidence, then by precedence. */
export function detect(text: string, detectors: readonly Detector[] = DETECTORS): DetectorMatch[] {
  const rank = (id: string) => {
    const index = (DETECTOR_PRECEDENCE as readonly string[]).indexOf(id);
    return index === -1 ? DETECTOR_PRECEDENCE.length : index;
  };
  return detectors
    .map((detector) => ({ id: detector.id, confidence: detector.detect(text) }))
    .filter((match) => match.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || rank(a.id) - rank(b.id));
}
