"use client";

import { createContext, use, useEffect, useEffectEvent } from "react";
import { takeHandoff, type Handoff } from "@/lib/handoff";

/** Slug of the tool on this page, provided by ToolLoader. */
export const ToolSlugContext = createContext<string | null>(null);

export function useToolSlug(): string | null {
  return use(ToolSlugContext);
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
