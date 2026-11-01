// Detector registry (tool-registry §5): one detector per smart-paste type.
// Smart paste on the homepage uses them (components/home/suggest.ts). Precedence and speed
// across all detectors are tested in detect.test.ts.

import { base64Detector } from "./base64";
import { jsonDetector } from "./json";
import { jwtDetector } from "./jwt";
import type { Detector } from "./types";
import { unixTimestampDetector } from "./unix-timestamp";
import { urlDetector, urlEncodedDetector } from "./url";
import { uuidDetector } from "./uuid";

export type { Detector } from "./types";

export const DETECTORS: readonly Detector[] = [
  jwtDetector,
  jsonDetector,
  unixTimestampDetector,
  base64Detector,
  urlDetector,
  urlEncodedDetector,
  uuidDetector,
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
