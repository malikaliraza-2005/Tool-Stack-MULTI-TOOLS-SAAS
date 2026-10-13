// Theme preference (design-system §11). The preference is the only thing
// stored; no user content (CLAUDE.md rule 4).

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

/** `--bg` per theme, for `<meta name="theme-color">`. Kept equal to globals.css by tokens.test.ts. */
export const THEME_BG = {
  light: "oklch(0.985 0.004 85)",
  dark: "oklch(0.165 0.005 70)",
} as const;

/** Versioned key (architecture §9). */
export const THEME_STORAGE_KEY = "ts:v1:theme";

export function parseThemePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

/**
 * Inline script run in <head> before first paint, so the page never flashes
 * the wrong theme. Must stay self-contained (no imports at runtime) and in
 * sync with `parseThemePreference` and `resolveTheme` (theme.test.ts).
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
