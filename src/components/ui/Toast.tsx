"use client";

import { lazy, Suspense, useSyncExternalStore, type ReactNode } from "react";

// Toasts (design-system §8). sonner and the region load with the first toast,
// not with the page (P9-T08: ≈ 11 KB gzipped off every page's initial JS).

const loadRegion = () => import("./ToastRegion");
const ToastRegion = lazy(loadRegion);

let requested = false;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Mounts the toast region once the first toast is requested. */
export function Toaster() {
  const show = useSyncExternalStore(
    subscribe,
    () => requested,
    () => false,
  );
  return show ? (
    <Suspense>
      <ToastRegion />
    </Suspense>
  ) : null;
}

type Toast = Awaited<ReturnType<typeof loadRegion>>["toast"];

async function show(publish: (toast: Toast) => void) {
  if (!requested) {
    requested = true;
    listeners.forEach((listener) => listener());
  }
  const { toast, mounted } = await loadRegion();
  await mounted;
  publish(toast);
}

type NotifyOptions = {
  description?: ReactNode;
  /** One button in the toast, e.g. "Refresh". */
  action?: { label: string; onClick: () => void };
  /** Stays until acted on or closed, like errors (e.g. "update available"). */
  persistent?: boolean;
};

const sonnerOptions = ({ persistent, ...options }: NotifyOptions = {}) =>
  persistent ? { ...options, duration: Infinity, closeButton: true } : options;

/** Toasts auto-dismiss after 4s, except errors, which stay until closed (§8). */
export const notify = {
  success: (message: ReactNode, options?: NotifyOptions) =>
    void show((toast) => toast.success(message, sonnerOptions(options))),
  info: (message: ReactNode, options?: NotifyOptions) =>
    void show((toast) => toast.info(message, sonnerOptions(options))),
  warning: (message: ReactNode, options?: NotifyOptions) =>
    void show((toast) => toast.warning(message, options)),
  error: (message: ReactNode, options?: NotifyOptions) =>
    void show((toast) =>
      toast.error(message, { ...options, duration: Infinity, closeButton: true }),
    ),
};
