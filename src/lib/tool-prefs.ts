// Favorite and recent tools (G-6, architecture §9). Only tool slugs are
// stored, never content. Pure helpers; the React hooks are in
// components/layout/useToolPrefs.ts.

import * as z from "zod/mini";
import { readStored, storageKey, writeStored } from "./storage";

export const FAVORITES_KEY = storageKey("favorites");
export const RECENT_KEY = storageKey("recent");

/** Shown in the palette; older visits drop off. */
export const MAX_RECENT = 5;
const MAX_FAVORITES = 30;

const slugList = (max: number) =>
  z.array(z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))).check(z.maxLength(max));

const favoritesSchema = slugList(MAX_FAVORITES);
const recentSchema = slugList(MAX_RECENT);

export function readFavorites(): string[] {
  return readStored(FAVORITES_KEY, favoritesSchema) ?? [];
}

export function readRecent(): string[] {
  return readStored(RECENT_KEY, recentSchema) ?? [];
}

export function writeFavorites(slugs: string[]): boolean {
  return writeStored(FAVORITES_KEY, favoritesSchema, slugs);
}

export function writeRecent(slugs: string[]): boolean {
  return writeStored(RECENT_KEY, recentSchema, slugs);
}

/** Adds or removes a favorite; new favorites go last, in the order chosen. */
export function toggleSlug(slugs: readonly string[], slug: string): string[] {
  return slugs.includes(slug)
    ? slugs.filter((s) => s !== slug)
    : [...slugs, slug].slice(-MAX_FAVORITES);
}

/** Moves the visited tool to the front and keeps the newest MAX_RECENT. */
export function pushRecent(slugs: readonly string[], slug: string): string[] {
  return [slug, ...slugs.filter((s) => s !== slug)].slice(0, MAX_RECENT);
}
