"use client";

import { useSyncExternalStore } from "react";
import {
  FAVORITES_KEY,
  pushRecent,
  readFavorites,
  readRecent,
  RECENT_KEY,
  toggleSlug,
  writeFavorites,
  writeRecent,
} from "@/lib/tool-prefs";

// Favorites and recent tools as external stores, so the palette and the
// favorite buttons stay in sync, also across tabs (storage event).

const listeners = new Set<() => void>();
// Snapshots must be stable between changes for useSyncExternalStore.
let favorites: string[] | null = null;
let recent: string[] | null = null;

function notify() {
  favorites = null;
  recent = null;
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === FAVORITES_KEY || event.key === RECENT_KEY) notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: string[] = [];
const serverSnapshot = () => EMPTY;

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, () => (favorites ??= readFavorites()), serverSnapshot);
}

export function useRecent(): string[] {
  return useSyncExternalStore(subscribe, () => (recent ??= readRecent()), serverSnapshot);
}

/** False when storage is unavailable (blocked or full); the site works without it. */
export function toggleFavorite(slug: string): boolean {
  const saved = writeFavorites(toggleSlug(readFavorites(), slug));
  notify();
  return saved;
}

export function recordRecent(slug: string) {
  writeRecent(pushRecent(readRecent(), slug));
  notify();
}
