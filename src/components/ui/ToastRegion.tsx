"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/cn";

const DESKTOP_QUERY = "(min-width: 48rem)";

function subscribe(callback: () => void) {
  const query = matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export { toast } from "sonner";

let markMounted: () => void;
/** Resolves a frame after the region is in the DOM, so its live region is registered first. */
export const mounted = new Promise<void>((resolve) => (markMounted = resolve));

/**
 * Toast region (design-system §8): bottom-centre on mobile, bottom-right on
 * desktop; sonner announces toasts politely. Restyled with tokens only.
 * Loaded with the first toast (`notify` in Toast.tsx), not with the page.
 */
export default function ToastRegion() {
  useEffect(() => {
    requestAnimationFrame(() => markMounted());
  }, []);
  const desktop = useSyncExternalStore(
    subscribe,
    () => matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
  return (
    <Sonner
      position={desktop ? "bottom-right" : "bottom-center"}
      duration={4000}
      gap={8}
      containerAriaLabel="Notifications"
      icons={{
        success: <CircleCheck aria-hidden className="size-5 text-success" />,
        info: <Info aria-hidden className="size-5 text-info" />,
        warning: <TriangleAlert aria-hidden className="size-5 text-warning" />,
        error: <CircleAlert aria-hidden className="size-5 text-danger" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            "flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-4 text-fg shadow-2",
            "sm:w-(--width)",
          ),
          title: "text-ui text-fg",
          description: "text-small text-fg-muted",
          icon: "mt-px shrink-0",
          actionButton:
            "ml-auto h-8 shrink-0 cursor-pointer rounded-md bg-accent px-3 text-ui text-accent-fg transition-control hover:bg-accent-hover",
          cancelButton:
            "ml-auto h-8 shrink-0 cursor-pointer rounded-md px-3 text-ui text-fg transition-control hover:bg-surface-2",
          closeButton:
            "order-last ml-auto inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-muted transition-control hover:bg-surface-2 hover:text-fg",
        },
      }}
    />
  );
}
