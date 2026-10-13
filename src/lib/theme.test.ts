import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  themeInitScript,
  type ThemePreference,
} from "./theme";

describe("parseThemePreference", () => {
  it.each(["light", "dark", "system"] as const)("accepts %s", (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  it.each([null, undefined, "", "blue", 1, {}])("falls back to system for %j", (value) => {
    expect(parseThemePreference(value)).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("follows the OS only for system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

/** Runs the inline pre-paint script against a stub document. */
function runInitScript(stored: string | null, systemDark: boolean, storageThrows = false) {
  const classes = new Set<string>();
  const context = {
    localStorage: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("SecurityError");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    },
    matchMedia: (query: string) => ({ matches: query.includes("dark") && systemDark }),
    document: {
      documentElement: {
        classList: {
          toggle: (name: string, force: boolean) =>
            force ? classes.add(name) : classes.delete(name),
        },
      },
    },
  };
  runInNewContext(themeInitScript, context);
  return classes.has("dark");
}

describe("themeInitScript", () => {
  const cases: [string | null, boolean][] = [
    ["light", true],
    ["dark", false],
    ["system", true],
    ["system", false],
    [null, true],
    ["garbage", false],
  ];

  it.each(cases)("stored %j with system dark=%s matches resolveTheme", (stored, systemDark) => {
    const expected = resolveTheme(parseThemePreference(stored) as ThemePreference, systemDark);
    expect(runInitScript(stored, systemDark)).toBe(expected === "dark");
  });

  it("does not throw when storage is blocked", () => {
    expect(() => runInitScript(null, true, true)).not.toThrow();
  });
});
