// Safe, versioned, validated localStorage (architecture §9). Stores
// preferences and tool options only. User content (files, text, tokens) is
// never stored (CLAUDE.md rule 4): values are validated against a schema of
// options and capped in size, so a misuse fails instead of persisting content.

/** Any schema with Zod's `safeParse` (Zod or `zod/mini`). */
export type Schema<T> = {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
};

const PREFIX = "ts:v1:";

/** Options are a handful of enums and booleans; anything bigger is a bug. */
export const MAX_STORED_CHARS = 2048;

/** `ts:v1:<name>` (architecture §9). */
export function storageKey(name: string): string {
  return `${PREFIX}${name}`;
}

/** `ts:v1:opts:<slug>`: last-used options of a tool. */
export function toolOptionsKey(slug: string): string {
  return storageKey(`opts:${slug}`);
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Access throws when storage is disabled (e.g. blocked cookies).
    return null;
  }
}

/** Reads and validates a stored value; `undefined` when missing, invalid or unavailable. */
export function readStored<T>(key: string, schema: Schema<T>): T | undefined {
  const storage = getStorage();
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return undefined;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validates and stores a value. Returns false (and stores nothing) when the
 * value fails the schema, is larger than MAX_STORED_CHARS, or storage is
 * unavailable or full. The site works without storage.
 */
export function writeStored<T>(key: string, schema: Schema<T>, value: T): boolean {
  if (!key.startsWith(PREFIX)) return false;
  const parsed = schema.safeParse(value);
  if (!parsed.success) return false;
  const raw = JSON.stringify(parsed.data);
  if (raw === undefined || raw.length > MAX_STORED_CHARS) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // Nothing to do: storage unavailable.
  }
}
