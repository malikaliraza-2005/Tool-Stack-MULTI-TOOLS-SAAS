import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FAVORITES_KEY,
  MAX_RECENT,
  pushRecent,
  readFavorites,
  readRecent,
  RECENT_KEY,
  toggleSlug,
  writeFavorites,
  writeRecent,
} from "./tool-prefs";

describe("favorites and recent tools (G-6)", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses versioned keys (architecture §9)", () => {
    expect(FAVORITES_KEY).toBe("ts:v1:favorites");
    expect(RECENT_KEY).toBe("ts:v1:recent");
  });

  it("toggles favorites in the order chosen", () => {
    expect(toggleSlug([], "merge-pdf")).toEqual(["merge-pdf"]);
    expect(toggleSlug(["merge-pdf"], "jwt-decoder")).toEqual(["merge-pdf", "jwt-decoder"]);
    expect(toggleSlug(["merge-pdf", "jwt-decoder"], "merge-pdf")).toEqual(["jwt-decoder"]);
  });

  it("keeps the newest recent tools first, without duplicates", () => {
    let recent: string[] = [];
    for (const slug of ["a", "b", "c", "b", "d", "e", "f", "g"]) recent = pushRecent(recent, slug);
    expect(recent).toEqual(["g", "f", "e", "d", "b"]);
    expect(recent).toHaveLength(MAX_RECENT);
  });

  it("round-trips slugs and ignores anything that isn't a slug list", () => {
    expect(writeFavorites(["merge-pdf", "json-formatter"])).toBe(true);
    expect(readFavorites()).toEqual(["merge-pdf", "json-formatter"]);
    expect(writeRecent(["Some pasted text"])).toBe(false);
    store.set(RECENT_KEY, JSON.stringify([{ text: "secret" }]));
    expect(readRecent()).toEqual([]);
  });

  it("works without storage", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(readFavorites()).toEqual([]);
    expect(writeFavorites(["merge-pdf"])).toBe(false);
  });
});
