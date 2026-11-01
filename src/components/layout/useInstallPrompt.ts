"use client";

import { useSyncExternalStore } from "react";

// Install prompt (P7-T14). Browsers that support it (Chromium) fire
// `beforeinstallprompt`; Sprigkit keeps the event and offers "Install" only
// where the user looks for it (the command palette), never as a pop-up.

type InstallPromptEvent = Event & { prompt(): Promise<void> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Called once from ServiceWorker; keeps the browser's own banner from showing. */
export function listenForInstallPrompt(): () => void {
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCanInstall(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
}

/** Shows the browser's install dialog; the event can be used once. */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  deferred = null;
  notify();
  await event?.prompt();
}
