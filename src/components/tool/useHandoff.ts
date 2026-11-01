"use client";

import { createContext, use, useEffect, useEffectEvent } from "react";
import { takeHandoff, type Handoff } from "@/lib/handoff";

/** A tool that accepts this tool's output (registry `handoff`, G-11). */
export type HandoffTarget = { slug: string; name: string; multiple: boolean };

/** The tool on this page, provided by ToolLoader. */
export const ToolContext = createContext<{ slug: string; handoff: HandoffTarget[] } | null>(null);

export function useToolSlug(): string | null {
  return use(ToolContext)?.slug ?? null;
}

export function useHandoffTargets(): HandoffTarget[] {
  return use(ToolContext)?.handoff ?? [];
}

/**
 * Receives input handed to this tool from the homepage or another tool
 * (lib/handoff). Runs once after mount; the hand-off is consumed, so a
 * Strict Mode re-run or a remount gets nothing.
 */
export function useHandoff(receive: (payload: Handoff) => void) {
  const slug = useToolSlug();
  const onReceive = useEffectEvent(receive);
  useEffect(() => {
    if (!slug) return;
    const payload = takeHandoff(slug);
    if (payload) onReceive(payload);
  }, [slug]);
}
