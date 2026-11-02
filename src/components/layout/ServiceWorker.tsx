"use client";

import { useEffect } from "react";
import { notify } from "@/components/ui/Toast";
import { listenForInstallPrompt } from "./useInstallPrompt";

const SW_URL = "/serwist/sw.js";

/**
 * Registers the service worker (G-5) after the page has loaded, in
 * production only. A new version waits until the user chooses "Refresh"
 * (P7-T16), so a page never reloads under someone's work. The page doesn't
 * reload when the connection comes back either.
 */
export function ServiceWorker() {
  useEffect(() => listenForInstallPrompt(), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    async function register() {
      const { Serwist } = await import("@serwist/window");
      if (cancelled) return;
      const sw = new Serwist(SW_URL, { scope: "/", type: "classic" });
      sw.addEventListener("waiting", () => {
        notify.info("A new version of Sprigkit is available", {
          description:
            "Refresh to update. Finish what you’re doing first: refreshing clears the page.",
          persistent: true,
          action: {
            label: "Refresh",
            onClick: () => {
              sw.addEventListener("controlling", () => window.location.reload());
              sw.messageSkipWaiting();
            },
          },
        });
      });
      await sw.register();
    }

    const start = () => void register().catch(() => {});
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, []);

  return null;
}
