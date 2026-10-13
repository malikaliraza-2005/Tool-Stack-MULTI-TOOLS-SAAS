"use client";

import { useCallback, useSyncExternalStore } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage can be blocked (privacy settings); the site still works.
    return "system";
  }
}

function applyTheme(preference: ThemePreference) {
  const dark = resolveTheme(preference, matchMedia(DARK_QUERY).matches) === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", onStorage);
    matchMedia(DARK_QUERY).addEventListener("change", onSystemChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      matchMedia(DARK_QUERY).removeEventListener("change", onSystemChange);
    }
  };
}

// Another tab changed the preference.
function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY) return;
  applyTheme(readPreference());
  notify();
}

// The OS theme changed; only matters when following the system.
function onSystemChange() {
  if (readPreference() === "system") applyTheme("system");
}

/**
 * Sets the preference, persists it and swaps the theme with a View Transition
 * cross-fade where supported (skipped under reduced motion, design-system §11).
 */
export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not persisted, but still applied for this page view.
  }
  const root = document.documentElement;
  const update = () => {
    applyTheme(preference);
    notify();
  };
  if (typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    update();
    return;
  }
  // The header is anchored during page transitions (globals.css); during a
  // theme change it must fade with the rest of the page.
  root.dataset.themeTransition = "";
  const transition = document.startViewTransition(update);
  void transition.finished.finally(() => delete root.dataset.themeTransition);
}

/** Current stored preference; "system" during server render and hydration. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const setPreference = useCallback((value: ThemePreference) => setThemePreference(value), []);
  return { preference, setPreference };
}
