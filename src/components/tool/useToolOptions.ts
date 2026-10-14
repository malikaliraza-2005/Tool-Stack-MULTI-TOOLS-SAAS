"use client";

import { useCallback, useEffect, useState } from "react";
import { readStored, toolOptionsKey, writeStored, type Schema } from "@/lib/storage";

/**
 * Last-used options of a tool, persisted in localStorage (tool-specifications
 * §2.3). Options only, never input content. The first render uses the
 * defaults (same as the static HTML), then the stored options are applied.
 */
export function useToolOptions<T extends object>(
  slug: string,
  schema: Schema<T>,
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const [options, setOptions] = useState<T>(defaults);

  useEffect(() => {
    const stored = readStored(toolOptionsKey(slug), schema);
    // Applying stored options after hydration keeps the static HTML valid.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from storage
    if (stored) setOptions((current) => ({ ...current, ...stored }));
  }, [slug, schema]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setOptions((current) => {
        const next = { ...current, ...patch };
        writeStored(toolOptionsKey(slug), schema, next);
        return next;
      });
    },
    [slug, schema],
  );

  return [options, update];
}
