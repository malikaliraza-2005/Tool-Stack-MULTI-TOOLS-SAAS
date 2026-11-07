"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Plays the entrance of `[data-reveal]` items as they scroll into view. Only
 * items still below the viewport are hidden, and only from here, so the static
 * HTML stays fully visible and nothing on screen flashes. Renders nothing.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (item) => item.getBoundingClientRect().top >= window.innerHeight,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "in";
          observer.unobserve(entry.target);
        }
      },
      // Start just inside the viewport, so the movement is actually seen.
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const item of items) {
      item.dataset.reveal = "pending";
      observer.observe(item);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
