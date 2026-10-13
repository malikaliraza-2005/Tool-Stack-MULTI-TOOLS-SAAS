type ClassValue = string | false | null | undefined;

/** Joins class names, skipping falsy values. No merging: variants must not overlap. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
