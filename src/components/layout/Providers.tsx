"use client";

import { useEffect, type ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Toaster } from "@/components/ui/Toast";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { STARTUP_ATTRIBUTE } from "@/lib/startup-check";
import { ServiceWorker } from "./ServiceWorker";

export function Providers({ children }: { children: ReactNode }) {
  // The app runs: the startup notice (src/lib/startup-check.ts) must not show.
  useEffect(() => document.documentElement.setAttribute(STARTUP_ATTRIBUTE, ""), []);
  return (
    <MotionProvider>
      <TooltipProvider>
        {children}
        <Toaster />
        <ServiceWorker />
      </TooltipProvider>
    </MotionProvider>
  );
}
