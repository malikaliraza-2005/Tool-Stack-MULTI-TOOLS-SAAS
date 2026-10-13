"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { duration, ease } from "@/lib/motion";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * Shared Motion config (design-system §7.5). `LazyMotion strict` keeps the
 * initial bundle to the tiny `m` component; animation features load after
 * hydration. `reducedMotion="user"` drops transform and layout animations
 * when the OS asks for reduced motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: duration.standard, ease: ease.out }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
