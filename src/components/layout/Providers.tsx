"use client";

import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Toaster } from "@/components/ui/Toast";
import { TooltipProvider } from "@/components/ui/Tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </MotionProvider>
  );
}
